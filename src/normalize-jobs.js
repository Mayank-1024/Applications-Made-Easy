// Six sources, six shapes, one schema. The Map nodes only rename fields;
// this node does the cleaning that has to be identical for every source:
//  - descriptions: decode entities and strip HTML. Greenhouse double-encodes
//    (&lt;p&gt; inside JSON), so decode -> strip -> decode -> strip.
//  - dates: ISO strings, "YYYY-MM-DD HH:mm:ss", unix seconds and unix
//    milliseconds (sometimes as strings) all become YYYY-MM-DD, or null.
//  - text fields: trimmed, whitespace collapsed.
// Source-status items pass straight through for the Run Log.

const cfg = $('Build Config').first().json;

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-',
                hellip: '...', lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"', bull: '•', middot: '·',
                copy: '©', reg: '®', trade: '™', eacute: 'é', egrave: 'è', uuml: 'ü', ouml: 'ö', auml: 'ä' };
const decode = (s) => String(s ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
const stripTags = (s) => s
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ');
const clean = (s) => stripTags(decode(stripTags(decode(s)))).replace(/\s+/g, ' ').trim();

const now = Date.now();
const toIsoDate = (v) => {
  if (v === null || v === undefined || v === '') return null;
  let d;
  const s = String(v).trim();
  if (/^\d{9,13}$/.test(s)) {                     // unix seconds (<1e12) or milliseconds
    const n = Number(s);
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else {
    d = new Date(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? s.replace(' ', 'T') : s);
  }
  if (isNaN(d.getTime())) return null;
  // Reject obvious garbage: pre-2015 epochs from bad parsing, or the future.
  if (d.getUTCFullYear() < 2015 || d.getTime() > now + 86400000) return null;
  return d.toISOString().slice(0, 10);
};

const all = $input.all().map(i => i.json);
const statuses = all.filter(r => r._kind === 'source_status');
const out = statuses.map(s => ({ json: s }));
const perSource = {};

for (const j of all) {
  if (j._kind !== 'job') continue;
  const description = clean(j.description_raw);
  out.push({ json: {
    _kind: 'job',
    tier: j.tier,
    board: j.board,
    source: j.source,
    company: String(j.company ?? '').replace(/\s+/g, ' ').trim(),
    title: clean(j.title),
    url: String(j.url ?? '').trim(),
    description,                                   // full cleaned text; trimmed for the sheet later
    posted_date: toIsoDate(j.posted_raw),
    location: clean(j.location)
  }});
  perSource[j.board] = (perSource[j.board] ?? 0) + 1;
}

console.log(`[normalize] ${out.length - statuses.length} jobs from ${statuses.length} sources | ` +
            Object.entries(perSource).map(([k, v]) => `${k} ${v}`).join(', '));
return out;
