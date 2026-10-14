// Local dry run of the workflow's Code nodes against saved API responses.
// It runs the exact ./src files in n8n's node order, with minimal stand-ins
// for $input, $('Node') (first/all/itemMatching/isExecuted) and $now.
// It does NOT exercise n8n itself (HTTP retries, Merge, Sheets) - that's
// what the manual run in n8n is for.
//
// Usage: node test-local.mjs <samples-dir> [--existing N] [--dead-board]
//   samples-dir holds gh_<token>.json, as_<board>.json, lever_<slug>.json,
//   remotive.json, remoteok.json, jobicy.json (missing file = simulated 404).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [samples, ...flags] = process.argv.slice(2);
if (!samples) { console.error('usage: node test-local.mjs <samples-dir> [--existing N] [--dead-board]'); process.exit(1); }
const existingN = flags.includes('--existing') ? Number(flags[flags.indexOf('--existing') + 1]) : 0;

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const $now = { toFormat: (f) => f === 'yyyy-MM-dd' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
                                                 : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} local` };

const outputs = {};          // node name -> [{json}]
const pairing = {};          // node name -> [index into parent output] per item
const run = (name, file, input, inputPairs = null) => {
  const code = readFileSync(join(here, 'src', file), 'utf8');
  const $input = { all: () => input, first: () => input[0] };
  const $ = (node) => ({
    first: () => outputs[node][0],
    all: () => outputs[node],
    get isExecuted() { return node in outputs; },
    itemMatching: (i) => outputs[node][(inputPairs ?? [])[i]]
  });
  const logs = [];
  const fakeConsole = { log: (...a) => logs.push(a.join(' ')) };
  const result = new Function('$input', '$', '$now', 'console', code)($input, $, $now, fakeConsole);
  outputs[name] = result;
  logs.forEach(l => console.log(`  ${l}`));
  return result;
};
const load = (f) => existsSync(join(samples, f)) ? JSON.parse(readFileSync(join(samples, f), 'utf8')) : null;
const http404 = { json: { error: { message: '404 - "Not Found"', httpCode: '404' } } };

// Simulate an HTTP node fed by a Targets node: one response per target,
// bare arrays split into items (as n8n does), all paired to their target.
const fanOut = (targetsNode, fileFor) => {
  const items = [], pairs = [];
  outputs[targetsNode].forEach((t, i) => {
    const body = load(fileFor(t.json));
    const asItems = body === null ? [http404] : Array.isArray(body) ? body.map(b => ({ json: b })) : [{ json: body }];
    asItems.forEach(it => { items.push(it); pairs.push(i); });
  });
  return { items, pairs };
};

console.log('== Build Config');
const cfg = run('Build Config', 'build-config.js', [{ json: {} }])[0].json;
if (flags.includes('--dead-board')) cfg.ashby_boards.push({ company: 'Deel', board: 'deel' }, { company: 'Wayfair', board: 'wayfair-404' });

// Simulated Applications: first N Anthropic jobs already saved, with tracking params
// added to prove the dedupe key ignores them.
const existingRows = [];
if (existingN) {
  const gh = load('gh_anthropic.json');
  gh.jobs.slice(0, existingN).forEach((j, i) => existingRows.push({ json: {
    's.no': 41 + i, 'job posting link': `${j.absolute_url}?utm_source=linkedin&gh_src=abc`, 'company name': 'Anthropic' } }));
}
console.log(`== Index Existing Rows (simulated sheet: ${existingRows.length} rows)`);
run('Index Existing Rows', 'index-existing-rows.js', existingRows.length ? existingRows : [{ json: {} }]);

console.log('== Company boards');
run('Greenhouse Targets', 'targets-greenhouse.js', [{ json: {} }]);
let f = fanOut('Greenhouse Targets', t => `gh_${t.token}.json`);
run('Map Greenhouse', 'map-greenhouse.js', f.items, f.pairs);
run('Ashby Targets', 'targets-ashby.js', [{ json: {} }]);
f = fanOut('Ashby Targets', t => `as_${t.board}.json`);
run('Map Ashby', 'map-ashby.js', f.items, f.pairs);
run('Lever Targets', 'targets-lever.js', [{ json: {} }]);
f = fanOut('Lever Targets', t => `lever_${t.slug}.json`);
run('Map Lever', 'map-lever.js', f.items, f.pairs);

console.log('== Aggregate boards');
run('Map Remotive', 'map-remotive.js', [{ json: load('remotive.json') ?? http404.json }]);
const rok = load('remoteok.json');
run('Map RemoteOK', 'map-remoteok.js', rok ? rok.map(j => ({ json: j })) : [http404]);
run('Map Jobicy', 'map-jobicy.js', [{ json: load('jobicy.json') ?? http404.json }]);

console.log('== Merge + Normalize');
const merged = ['Map Greenhouse', 'Map Ashby', 'Map Lever', 'Map Remotive', 'Map RemoteOK', 'Map Jobicy'].flatMap(n => outputs[n]);
run('Normalize Jobs', 'normalize-jobs.js', merged);

console.log('== Filter, Rank & Cap');
const { rows, stats } = run('Filter, Rank & Cap', 'filter-rank-cap.js', outputs['Normalize Jobs'])[0].json;

console.log('== Output path');
if (rows.length) {
  outputs['Append to Applications'] = rows.map(r => ({ json: r }));   // pretend Google accepted every row
  console.log(`  If -> true: ${rows.length} rows to Applications`);
} else {
  console.log('  If -> false: straight to Run Log');
}
const log = run('Build Run Log', 'build-run-log.js', [{ json: {} }])[0].json;

console.log('\n== RESULT');
console.log(JSON.stringify({ dropped: stats.dropped, matched: stats.matched, deferred_company_cap: stats.deferred_company_cap,
                             deferred_run_cap: stats.deferred_run_cap }, null, 1));
console.log('Run Log row:', JSON.stringify(log, null, 1));
console.log('First 3 rows:', JSON.stringify(rows.slice(0, 3), null, 1));
const byCo = {}; rows.forEach(r => { byCo[r['company name']] = (byCo[r['company name']] ?? 0) + 1; });
console.log('Rows per company:', JSON.stringify(byCo));
