// Lever -> unified job shape. Lever returns a bare array, which the HTTP node
// splits into one item per posting - so a board yields many items, all paired
// back to the same Lever Targets item. A board that returns [] yields no items
// at all, which is why boards are seeded from the target list first.
const SOURCE = 'Lever';
const configured = $('Build Config').first().json.lever_boards ?? [];

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
  try { return $('Lever Targets').itemMatching(idx)?.json ?? {}; } catch { return {}; }
};

const boards = new Map(configured.map(c => [c.company, { company: c.company, status: 'dead', jobs: 0, reason: 'empty' }]));
const out = [];

$input.all().forEach((item, idx) => {
  const target = targetFor(idx);
  if (!target.company) return;                    // unpaired placeholder item
  const company = target.company;
  const j = item.json ?? {};
  const b = boards.get(company) ?? { company, status: 'dead', jobs: 0, reason: 'empty' };
  boards.set(company, b);

  if (j.error) { if (!b.jobs) { b.status = 'dead'; b.reason = failReason(j.error); } return; }
  if (!j.text || !j.hostedUrl) return;

  b.status = 'ok'; b.reason = ''; b.jobs++;
  // The plain description omits the requirement lists, which is where most
  // of the substance is - append them so the description check is fair.
  const lists = (j.lists ?? []).map(l => `${l.text ?? ''}: ${l.content ?? ''}`).join(' ');
  const locs = j.categories?.allLocations?.length ? j.categories.allLocations : [j.categories?.location].filter(Boolean);
  if (j.workplaceType === 'remote' && !locs.some(l => /remote/i.test(l))) locs.push('Remote');
  out.push({ json: {
    _kind: 'job', tier: 'company', board: SOURCE, source: `${SOURCE}: ${company}`, company,
    title: j.text,
    url: j.hostedUrl,
    description_raw: `${j.descriptionPlain ?? ''} ${lists} ${j.additionalPlain ?? ''}`,
    posted_raw: j.createdAt ?? '',               // unix milliseconds (as a string)
    location: locs.join(' | ')
  }});
});

const list = [...boards.values()];
const ok = list.filter(b => b.status === 'ok');
const dead = list.filter(b => b.status !== 'ok');
console.log(`[${SOURCE}] ${ok.length}/${list.length} boards ok, ${out.length} jobs` +
            (dead.length ? ` | dead: ${dead.map(b => `${b.company} (${b.reason})`).join(', ')}` : ''));

return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'company',
                  status: ok.length ? 'ok' : 'unavailable', count: out.length, boards: list } }, ...out];
