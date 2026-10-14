// Filters, in the order the brief specifies, each counted so the drop
// breakdown tells you exactly where jobs went:
//   required fields -> description length -> valid date -> age -> role
//   -> location -> dedupe within run -> dedupe against Applications
// Then rank (company boards first, newest first), apply the per-company and
// per-run caps, and shape rows to the Applications header.
//
// Output is ONE item: { rows, stats }. Keeping the rows inside a single item
// (instead of one item per row) means this node always emits something, even
// on a zero-match run, so the If node can route that run straight to the
// Run Log instead of the branch silently stopping.

const cfg = $('Build Config').first().json;
const sheet = $('Index Existing Rows').first().json;
const all = $input.all().map(i => i.json);
const statuses = all.filter(r => r._kind === 'source_status');
const jobs = all.filter(r => r._kind === 'job');

// ---- matching helpers -------------------------------------------------
// Whole-word match, case-insensitive, optional plural "s". Plain substring
// matching is how 'intern' ends up excluding "internal tools" and 'india'
// ends up blocking "Indianapolis, Indiana".
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRx = (terms) => terms.length
  ? new RegExp(`(?<![a-z0-9])(?:${terms.map(t => esc(String(t).toLowerCase().trim())).join('|')})s?(?![a-z0-9])`, 'i')
  : null;
const test = (rx, s) => !!rx && rx.test(s);

const roleRx = cfg.filters.map(f => ({ name: f.name, inc: wordRx(f.include ?? []), exc: wordRx(f.exclude ?? []) }));
const matchRole = (j) => {
  const field = cfg.match_in === 'title_and_description' ? `${j.title} ${j.description}` : j.title;
  // Excludes look at the same field as includes. Checking excludes against
  // the description would drop any role that "reports to the Director".
  for (const f of roleRx) if (test(f.inc, field) && !test(f.exc, field)) return f.name;
  return null;
};

const usRx = wordRx(cfg.location_us_explicit);
const blockRx = wordRx(cfg.location_block);
const allowRx = wordRx(cfg.location_allow);
const stateRx = cfg.us_state_codes.length
  ? new RegExp(`,\\s*(?:${cfg.us_state_codes.join('|')})(?![A-Za-z])`)   // case-sensitive on purpose
  : null;
const matchLocation = (loc) => {
  if (!loc) return true;                          // unknown location: let it through
  const segments = loc.split(/\s*(?:;|\||•|\/|\bor\b|\n)\s*/i).filter(Boolean);
  return segments.some(seg =>
    test(usRx, seg) || (!test(blockRx, seg) && (test(allowRx, seg) || test(stateRx, seg))));
};

// ---- URL dedupe key -----------------------------------------------------
// Lowercased host+path with "www." and trailing slashes dropped, fragment
// dropped, and only identity query params kept (cfg.url_id_params).
// Applied identically to new jobs and to links already in Applications.
const idParams = new Set(cfg.url_id_params.map(p => p.toLowerCase()));
const urlKey = (u) => {
  const raw = String(u ?? '').trim();
  try {
    const url = new URL(raw);
    const kept = [...url.searchParams].filter(([k]) => idParams.has(k.toLowerCase()))
      .map(([k, v]) => `${k.toLowerCase()}=${v}`).sort();
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}${kept.length ? '?' + kept.join('&') : ''}`.toLowerCase();
  } catch {
    return raw.toLowerCase().replace(/#.*$/, '').replace(/\/+$/, '');
  }
};

// ---- filter pass --------------------------------------------------------
const existing = new Set(sheet.existing_links.map(urlKey));
const seen = new Set();
const dayMs = 86400000;
const today = Date.now();
const dropped = { missing_fields: 0, thin_description: 0, bad_date: 0, too_old: 0,
                  no_role_match: 0, location_blocked: 0, duplicate_in_run: 0, already_in_sheet: 0 };
const matched = [];

for (const j of jobs) {
  if (!j.title || !j.url || !j.company) { dropped.missing_fields++; continue; }
  if (j.description.length < cfg.min_desc_len) { dropped.thin_description++; continue; }
  if (!j.posted_date) { dropped.bad_date++; continue; }
  const maxAge = cfg.max_age_days?.[j.tier];
  if (maxAge != null && (today - Date.parse(j.posted_date + 'T00:00:00Z')) / dayMs > maxAge) { dropped.too_old++; continue; }
  const role = matchRole(j);
  if (!role) { dropped.no_role_match++; continue; }
  if (!matchLocation(j.location)) { dropped.location_blocked++; continue; }
  const key = urlKey(j.url);
  if (seen.has(key)) { dropped.duplicate_in_run++; continue; }
  seen.add(key);
  if (existing.has(key)) { dropped.already_in_sheet++; continue; }
  matched.push({ ...j, matched_filter: role });
}

// ---- rank and cap -------------------------------------------------------
// Company boards first, then newest first; company name as a stable tiebreak.
const tierRank = (j) => (j.tier === 'company' ? 0 : 1);
matched.sort((a, b) => tierRank(a) - tierRank(b) || b.posted_date.localeCompare(a.posted_date) ||
                       a.company.localeCompare(b.company));

// Per-company cap. Jobs over the cap aren't lost: they're not in the sheet,
// so they come back as candidates next run.
const perCompany = {};
let deferredCompanyCap = 0;
const capped = matched.filter(j => {
  const k = j.company.toLowerCase();
  perCompany[k] = (perCompany[k] ?? 0) + 1;
  if (cfg.max_per_company && perCompany[k] > cfg.max_per_company) { deferredCompanyCap++; return false; }
  return true;
});

// Run cap, optionally holding back slots for aggregate boards.
const agg = capped.filter(j => j.tier !== 'company');
const reserve = Math.min(cfg.min_aggregate_slots ?? 0, agg.length, cfg.max_results);
const companyTake = capped.filter(j => j.tier === 'company').slice(0, cfg.max_results - reserve);
const final = [...companyTake, ...agg.slice(0, cfg.max_results - companyTake.length)];
const deferredRunCap = capped.length - final.length;

// ---- shape to the Applications header (exact, lowercase) ----------------------
const trimDesc = (s) => s.length > cfg.desc_max_chars
  ? s.slice(0, cfg.desc_max_chars - 3).replace(/\s+\S*$/, '') + '...'
  : s;
const rows = final.map((j, i) => ({
  's.no': sheet.next_sno + i,
  'company name': j.company,
  'job posting link': j.url,
  'job role': j.title,
  'job description': trimDesc(j.description),
  'day posted': j.posted_date,
  'location': j.location || 'Not stated',
  'matched filter': j.matched_filter,
  'source': j.source,
  'added on': cfg.run_date
}));

const stats = {
  collected: jobs.length,
  matched: matched.length,
  appending: rows.length,
  deferred_company_cap: deferredCompanyCap,
  deferred_run_cap: deferredRunCap,
  dropped,
  existing_row_count: sheet.existing_row_count,
  sources: statuses
};

console.log(`[filter] collected ${jobs.length} | matched ${matched.length} | appending ${rows.length} | ` +
            `deferred: ${deferredCompanyCap} over company cap, ${deferredRunCap} over run cap | ` +
            `dropped ${JSON.stringify(dropped)}`);

return [{ json: { rows, stats } }];
