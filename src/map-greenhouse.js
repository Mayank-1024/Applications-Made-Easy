// Greenhouse -> unified job shape. Pure field mapping: HTML stripping and
// date normalisation happen once, in Normalize Jobs, for every source alike.
//
// Each response is tied back to its company through paired items
// (itemMatching) rather than array position, so a failed request can't shift
// every later company onto the wrong jobs.
const SOURCE = 'Greenhouse';
const configured = $('Build Config').first().json.greenhouse_boards ?? [];

if (!configured.length) {
  console.log(`[${SOURCE}] disabled (empty board list)`);
  return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'company', status: 'disabled', count: 0, boards: [] } }];
}

// Pull a short, human-readable failure reason out of an n8n error item.
const failReason = (err) => {
  const msg = typeof err === 'string' ? err : (err?.message ?? JSON.stringify(err ?? ''));
  const code = err?.httpCode ?? err?.status ?? (String(msg).match(/\b[45]\d\d\b/) ?? [])[0];
  return code ? `HTTP ${code}` : String(msg).slice(0, 60);
};

// itemMatching throws when an item has no pairing - which is the case for
// the placeholder {} that "Always Output Data" emits when every board
// came back empty. Treat that as "no target" rather than crashing.
const targetFor = (idx) => {
  try { return $('Greenhouse Targets').itemMatching(idx)?.json ?? {}; } catch { return {}; }
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
  const jobs = Array.isArray(res.jobs) ? res.jobs : [];
  if (!jobs.length) { b.status = 'dead'; b.reason = 'empty'; return; }
  b.status = 'ok'; b.reason = '';

  for (const j of jobs) {
    b.jobs++;
    out.push({ json: {
      _kind: 'job', tier: 'company', board: SOURCE, source: `${SOURCE}: ${company}`, company,
      title: j.title ?? '',
      url: j.absolute_url ?? '',
      description_raw: j.content ?? '',          // entity-encoded HTML; decoded downstream
      posted_raw: j.first_published ?? j.updated_at ?? '',
      location: j.location?.name ?? ''
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
