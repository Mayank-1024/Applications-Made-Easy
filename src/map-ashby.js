// Ashby -> unified job shape. Pure field mapping (see Map Greenhouse for the
// paired-item reasoning).
const SOURCE = 'Ashby';
const configured = $('Build Config').first().json.ashby_boards ?? [];

if (!configured.length) {
  console.log(`[${SOURCE}] disabled (empty board list)`);
  return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'company', status: 'disabled', count: 0, boards: [] } }];
}

const failReason = (err) => {
  const msg = typeof err === 'string' ? err : (err?.message ?? JSON.stringify(err ?? ''));
  const code = err?.httpCode ?? err?.status ?? (String(msg).match(/\b[45]\d\d\b/) ?? [])[0];
  return code ? `HTTP ${code}` : String(msg).slice(0, 60);
};

// itemMatching throws when an item has no pairing - which is the case for
// the placeholder {} that "Always Output Data" emits when every board
// came back empty. Treat that as "no target" rather than crashing.
const targetFor = (idx) => {
  try { return $('Ashby Targets').itemMatching(idx)?.json ?? {}; } catch { return {}; }
};

// Seeded from config so a board that got no response at all still shows as dead.
const boards = new Map(configured.map(c => [c.company, { company: c.company, status: 'dead', jobs: 0, reason: 'no response' }]));
const out = [];

$input.all().forEach((item, idx) => {
  const target = targetFor(idx);
  if (!target.company) return;                    // unpaired placeholder item
  const company = target.company;
  const res = item.json ?? {};
  const b = boards.get(company) ?? { company, status: 'dead', jobs: 0, reason: 'no response' };
  boards.set(company, b);

  if (res.error) { b.status = 'dead'; b.reason = failReason(res.error); return; }
  // Ashby answers 200 with an empty list for unknown boards, so "empty"
  // is the only signal that a board name is wrong.
  const jobs = (Array.isArray(res.jobs) ? res.jobs : []).filter(j => j.isListed !== false);
  if (!jobs.length) { b.status = 'dead'; b.reason = 'empty'; return; }
  b.status = 'ok'; b.reason = '';

  for (const j of jobs) {
    b.jobs++;
    // Ashby lists the main office plus "secondaryLocations"; keep them all so
    // a role that's NYC-or-Remote-US isn't judged on NYC alone.
    const extra = (j.secondaryLocations ?? []).map(l => l?.location ?? l).filter(Boolean);
    const locs = [j.location, ...extra].filter(Boolean);
    if (j.isRemote && !locs.some(l => /remote/i.test(l))) locs.push('Remote');
    out.push({ json: {
      _kind: 'job', tier: 'company', board: SOURCE, source: `${SOURCE}: ${company}`, company,
      title: j.title ?? '',
      url: j.jobUrl ?? j.applyUrl ?? '',
      description_raw: j.descriptionPlain || j.descriptionHtml || '',
      posted_raw: j.publishedAt ?? '',
      location: locs.join(' | ')
    }});
  }
});

const list = [...boards.values()];
const ok = list.filter(b => b.status === 'ok');
const dead = list.filter(b => b.status !== 'ok');
console.log(`[${SOURCE}] ${ok.length}/${list.length} boards ok, ${out.length} jobs` +
            (dead.length ? ` | dead: ${dead.map(b => `${b.company} (${b.reason})`).join(', ')}` : ''));

return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'company',
                  status: ok.length ? 'ok' : 'unavailable', count: out.length, boards: list } }, ...out];
