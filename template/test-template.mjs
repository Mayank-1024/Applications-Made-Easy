// Dry-runs the *template* JSON (not ../src) against saved API responses:
// evaluates the Set Fields node's expressions, then runs every Code node in
// n8n order with minimal stand-ins for $input, $(), itemMatching and $now.
// Usage: node template/test-template.mjs <samples-dir>
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const samples = process.argv[2];
const wf = JSON.parse(readFileSync(join(here, 'collect-job-postings-greenhouse-ashby-lever-google-sheets.json'), 'utf8'));
const node = (name) => wf.nodes.find((n) => n.name === name) ?? (() => { throw new Error(`no node ${name}`); })();

const $now = { toFormat: (f) => (f === 'yyyy-MM-dd' ? '2026-10-12' : '2026-10-12 09:00 EDT') };
const evalExpr = (v) => (typeof v === 'string' && v.startsWith('={{')
  ? new Function('$now', `return (${v.slice(3, -2)});`)($now) : v);

const outputs = {};
const cfgNode = node('Set Job Search Criteria');
outputs['Set Job Search Criteria'] = [{ json: Object.fromEntries(
  cfgNode.parameters.assignments.assignments.map((a) => [a.name, evalExpr(a.value)])) }];

const run = (name, input, pairs = null) => {
  const $ = (n) => ({ first: () => outputs[n][0], all: () => outputs[n], get isExecuted() { return n in outputs; },
                      itemMatching: (i) => outputs[n][(pairs ?? [])[i]] });
  const logs = [];
  const result = new Function('$input', '$', '$now', 'console', node(name).parameters.jsCode)(
    { all: () => input, first: () => input[0] }, $, $now, { log: (...a) => logs.push(a.join(' ')) });
  outputs[name] = result;
  logs.forEach((l) => console.log(`  ${l}`));
  return result;
};
const load = (f) => (existsSync(join(samples, f)) ? JSON.parse(readFileSync(join(samples, f), 'utf8')) : null);
const err404 = { json: { error: { message: '404 - "Not Found"', httpCode: '404' } } };
const fanOut = (targets, fileFor) => {
  const items = [], pairs = [];
  outputs[targets].forEach((t, i) => {
    const body = load(fileFor(t.json));
    (body === null ? [err404] : Array.isArray(body) ? body.map((b) => ({ json: b })) : [{ json: body }])
      .forEach((it) => { items.push(it); pairs.push(i); });
  });
  return [items, pairs];
};

run('Index Saved Job Data', [{ json: {} }]);
run('Distribute Greenhouse Boards', [{ json: {} }]); run('Transform Greenhouse Data', ...fanOut('Distribute Greenhouse Boards', (t) => `gh_${t.token}.json`));
run('Distribute Ashby Boards', [{ json: {} }]);      run('Transform Ashby Data', ...fanOut('Distribute Ashby Boards', (t) => `as_${t.board}.json`));
run('Distribute Lever Boards', [{ json: {} }]);      run('Transform Lever Data', ...fanOut('Distribute Lever Boards', (t) => `lever_${t.slug}.json`));
run('Transform Remotive Data', [{ json: load('remotive.json') }]);
run('Transform RemoteOK Data', load('remoteok.json').map((j) => ({ json: j })));
run('Transform Jobicy Data', [{ json: load('jobicy.json') }]);
run('Normalize Job Data', ['Transform Greenhouse Data', 'Transform Ashby Data', 'Transform Lever Data', 'Transform Remotive Data', 'Transform RemoteOK Data', 'Transform Jobicy Data'].flatMap((n) => outputs[n]));
const { rows } = run('Filter and Rank Job Listings', outputs['Normalize Job Data'])[0].json;
outputs['Append Jobs to Google Sheets'] = rows.map((r) => ({ json: r }));
const log = run('Generate Run Log Entry', [{ json: {} }])[0].json;
console.log('RUN LOG:', JSON.stringify(log));
