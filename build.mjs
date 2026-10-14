// Assembles applications-made-easy.json from the code files in ./src.
// Code nodes live as real .js files so they can be read, diffed and tested
// locally; this script is the only place node wiring and settings are set.
// Usage: node build.mjs   (writes ./applications-made-easy.json)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(here, 'src', f), 'utf8');

// Deterministic UUIDs from node names, so rebuilding doesn't churn ids.
const uuid = (name) => {
  const h = createHash('sha1').update(`applications-made-easy:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// alwaysOutputData: a board that answers [] (Lever does) produces zero items;
// without this, a branch where every board is empty would never reach the
// Merge. The Map nodes treat the resulting {} item as "no jobs".
// Node versions are pinned to what this n8n instance already runs (seen in its
// other workflows), not the newest in the n8n-mcp database: Schedule 1.4 and
// HTTP 4.5 rendered as unknown nodes on this instance.
const HTTP_RESILIENCE = { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000, onError: 'continueRegularOutput',
                          alwaysOutputData: true };

const code = (name, file, position, extra = {}) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.code', typeVersion: 2, position,
  parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: src(file) }, ...extra
});
const http = (name, position, parameters) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position,
  parameters: { method: 'GET', options: { timeout: 30000 }, ...parameters }, ...HTTP_RESILIENCE
});
// The sheet is a fixed value, not an expression: the n8n editor clears an
// expression-driven tab whenever the node is opened (its dependent-field reset).
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
const sheetRef = (tab) => ({
  documentId: { __rl: true, mode: 'id', value: SHEET_ID },
  sheetName: { __rl: true, mode: 'name', value: tab }
});
const sheetAppend = (name, position, tab, extra = {}) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position,
  parameters: {
    resource: 'sheet',
    operation: 'append',
    ...sheetRef(tab),
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [],
               attemptToConvertTypes: false, convertFieldsToString: false },
    // RAW: a description that starts with "=" stays text instead of becoming
    // a formula, and dates stay the exact YYYY-MM-DD string we wrote.
    // error: a field with no matching header fails loudly instead of
    // quietly creating a new column.
    options: { cellFormat: 'RAW', handlingExtraData: 'error' }
  },
  ...extra
});
const sticky = (name, position, width, height, color, content) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position,
  parameters: { content, width, height, color }
});

const Y = 520;   // main spine
const nodes = [
  // ---------------- stickies ----------------
  sticky('Note: Trigger & Config', [-1380, -160], 900, 1380, 7,
`## ① Trigger, config, read-before-write
Runs **every 3 days at 09:00** (workflow timezone: America/New_York).

**Build Config is the node you edit** for role filter groups, location lists, company boards, caps and max age. The Google Sheet itself is picked on the three Sheets nodes.

**Read Applications** happens *before* any fetching. **Index Existing Rows** collapses it to one item: links already saved, next \`s.no\`, row count. A failed read **stops the run** on purpose. Carrying on with an empty dedupe set would re-append everything.`),
  sticky('Note: Company boards', [-420, -160], 700, 700, 4,
`## ②a Company career boards (highest signal)
Greenhouse, Ashby and Lever expose each company's job board as public JSON. No key, no scraping. One request per company.

Add a company in **Build Config → GREENHOUSE_BOARDS / ASHBY_BOARDS / LEVER_BOARDS**. Verify the token in a browser first (URL patterns are in the config comments).

Each HTTP node retries 3× (2 s apart) and **continues on error**. A dead board shows up in the Run Log as e.g. \`Benchling (Ashby, empty)\`.`),
  sticky('Note: Aggregate boards', [-420, 580], 700, 640, 5,
`## ②b Aggregate remote boards (broad, lower signal)
Remotive, RemoteOK, Jobicy (\`geo=usa\`). Free and keyless. All three require a link back to them, and the sheet stores their own URLs.

Same resilience: 3 retries, continue on error, and dead sources are named in the Run Log.

Nothing to edit here day to day.`),
  sticky('Note: Normalize', [320, -160], 460, 1380, 6,
`## ③ Merge + normalize
Six shapes in, one shape out:
\`tier, board, source, company, title, url, description, posted_date, location\`

- HTML stripped, entities decoded twice (Greenhouse double-encodes)
- Dates: ISO / "YYYY-MM-DD HH:mm:ss" / unix s / unix ms → \`YYYY-MM-DD\`

Nothing to edit here.`),
  sticky('Note: Filter', [820, -160], 460, 1380, 3,
`## ④ Filter, rank, cap
required fields → description length → valid date → age (aggregates only) → role → location → dupes in run → dupes in Applications

Then: company boards first, newest first, ≤15 per company, ≤100 per run.

Emits **one** item \`{rows, stats}\` so a zero-match run still flows on to the Run Log. \`stats.dropped\` in the output shows the breakdown by reason.

Tune behaviour in **Build Config**, not here.`),
  sticky('Note: Output', [1320, -160], 960, 1380, 2,
`## ⑤ Write to the sheet
**Applications**: one row per new job. Columns must match the header row exactly (lowercase).
**Run Log**: one row per run, **always written**, including runs with zero new jobs.

\`rows appended\` counts what Google actually accepted. A failed append is written into \`dead sources\` instead of killing the log.`),

  // ---------------- ① trigger & config ----------------
  {
    id: uuid('Every 3 Days'), name: 'Every 3 Days', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2,
    position: [-1300, Y],
    parameters: {
      rule: { interval: [{ field: 'days', daysInterval: 3, triggerAtHour: 9, triggerAtMinute: 0 }] }
    }
  },
  code('Build Config', 'build-config.js', [-1080, Y]),
  {
    id: uuid('Read Applications'), name: 'Read Applications', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5,
    position: [-860, Y],
    parameters: {
      resource: 'sheet',
      operation: 'read',
      ...sheetRef('Applications'),
      options: {}
    },
    // Empty sheet -> one {} item instead of halting the workflow.
    alwaysOutputData: true
  },
  code('Index Existing Rows', 'index-existing-rows.js', [-640, Y]),

  // ---------------- ②a company boards ----------------
  code('Greenhouse Targets', 'targets-greenhouse.js', [-340, 20], { alwaysOutputData: true }),
  http('Greenhouse Boards', [-120, 20], { url: '=https://boards-api.greenhouse.io/v1/boards/{{ $json.token }}/jobs?content=true' }),
  code('Map Greenhouse', 'map-greenhouse.js', [100, 20]),
  code('Ashby Targets', 'targets-ashby.js', [-340, 220], { alwaysOutputData: true }),
  http('Ashby Boards', [-120, 220], { url: '=https://api.ashbyhq.com/posting-api/job-board/{{ $json.board }}?includeCompensation=false' }),
  code('Map Ashby', 'map-ashby.js', [100, 220]),
  code('Lever Targets', 'targets-lever.js', [-340, 420], { alwaysOutputData: true }),
  http('Lever Boards', [-120, 420], { url: '=https://api.lever.co/v0/postings/{{ $json.slug }}?mode=json' }),
  code('Map Lever', 'map-lever.js', [100, 420]),

  // ---------------- ②b aggregate boards ----------------
  http('Remotive API', [-120, 700], {
    url: 'https://remotive.com/api/remote-jobs',
    sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: [{ name: 'limit', value: '100' }] }
  }),
  code('Map Remotive', 'map-remotive.js', [100, 700]),
  http('RemoteOK API', [-120, 880], {
    url: 'https://remoteok.com/api',
    sendHeaders: true, specifyHeaders: 'keypair',
    headerParameters: { parameters: [{ name: 'User-Agent', value: 'ApplicationsMadeEasy/1.0 (personal job search; n8n)' }] }
  }),
  code('Map RemoteOK', 'map-remoteok.js', [100, 880]),
  http('Jobicy API', [-120, 1060], {
    url: 'https://jobicy.com/api/v2/remote-jobs',
    sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: [{ name: 'count', value: '100' }, { name: 'geo', value: 'usa' }] }
  }),
  code('Map Jobicy', 'map-jobicy.js', [100, 1060]),

  // ---------------- ③ merge & normalize ----------------
  {
    id: uuid('Merge All Sources'), name: 'Merge All Sources', type: 'n8n-nodes-base.merge', typeVersion: 3.2,
    position: [400, Y], parameters: { mode: 'append', numberInputs: 6 }
  },
  code('Normalize Jobs', 'normalize-jobs.js', [620, Y]),

  // ---------------- ④ filter ----------------
  code('Filter, Rank & Cap', 'filter-rank-cap.js', [900, Y]),
  {
    id: uuid('Any New Jobs?'), name: 'Any New Jobs?', type: 'n8n-nodes-base.if', typeVersion: 2.2,
    position: [1120, Y],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          id: uuid('cond:rows>0'),
          leftValue: '={{ $json.rows.length }}',
          rightValue: 0,
          operator: { type: 'number', operation: 'gt' }
        }],
        combinator: 'and'
      },
      options: {}
    }
  },

  // ---------------- ⑤ output ----------------
  {
    id: uuid('Split Rows'), name: 'Split Rows', type: 'n8n-nodes-base.splitOut', typeVersion: 1,
    position: [1380, 400], parameters: { fieldToSplitOut: 'rows', include: 'noOtherFields', options: {} }
  },
  sheetAppend('Append to Applications', [1600, 400], 'Applications', { onError: 'continueRegularOutput' }),
  code('Build Run Log', 'build-run-log.js', [1860, 660]),
  sheetAppend('Append to Run Log', [2080, 660], 'Run Log')
];

const link = (to, index = 0) => ({ node: to, type: 'main', index });
const connections = {
  'Every 3 Days':        { main: [[link('Build Config')]] },
  'Build Config':        { main: [[link('Read Applications')]] },
  'Read Applications':         { main: [[link('Index Existing Rows')]] },
  'Index Existing Rows': { main: [[link('Greenhouse Targets'), link('Ashby Targets'), link('Lever Targets'),
                                   link('Remotive API'), link('RemoteOK API'), link('Jobicy API')]] },
  'Greenhouse Targets':  { main: [[link('Greenhouse Boards')]] },
  'Greenhouse Boards':   { main: [[link('Map Greenhouse')]] },
  'Ashby Targets':       { main: [[link('Ashby Boards')]] },
  'Ashby Boards':        { main: [[link('Map Ashby')]] },
  'Lever Targets':       { main: [[link('Lever Boards')]] },
  'Lever Boards':        { main: [[link('Map Lever')]] },
  'Remotive API':        { main: [[link('Map Remotive')]] },
  'RemoteOK API':        { main: [[link('Map RemoteOK')]] },
  'Jobicy API':          { main: [[link('Map Jobicy')]] },
  'Map Greenhouse':      { main: [[link('Merge All Sources', 0)]] },
  'Map Ashby':           { main: [[link('Merge All Sources', 1)]] },
  'Map Lever':           { main: [[link('Merge All Sources', 2)]] },
  'Map Remotive':        { main: [[link('Merge All Sources', 3)]] },
  'Map RemoteOK':        { main: [[link('Merge All Sources', 4)]] },
  'Map Jobicy':          { main: [[link('Merge All Sources', 5)]] },
  'Merge All Sources':   { main: [[link('Normalize Jobs')]] },
  'Normalize Jobs':      { main: [[link('Filter, Rank & Cap')]] },
  'Filter, Rank & Cap':  { main: [[link('Any New Jobs?')]] },
  'Any New Jobs?':       { main: [[link('Split Rows')], [link('Build Run Log')]] },
  'Split Rows':          { main: [[link('Append to Applications')]] },
  'Append to Applications':    { main: [[link('Build Run Log')]] },
  'Build Run Log':       { main: [[link('Append to Run Log')]] }
};

const workflow = {
  name: 'Applications made easy',
  nodes,
  connections,
  settings: { executionOrder: 'v1', timezone: 'America/New_York', saveManualExecutions: true }
};

writeFileSync(join(here, 'applications-made-easy.json'), JSON.stringify(workflow, null, 2) + '\n');
console.log(`wrote applications-made-easy.json: ${nodes.length} nodes, ${Object.keys(connections).length} connection sources`);
