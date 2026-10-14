// Builds the n8n Creator Portal template for "Applications made easy" from the
// live workflow's source files in ../src, applying the template-only changes:
//  - the Code-based config becomes a Set Fields node ("Configure Job Search")
//  - max age becomes two plain numbers (0 = no limit) instead of an object
//  - no credentials, no spreadsheet ID, no timezone, no instance metadata
//  - a yellow sticky holds the full template description; step notes are neutral
// Usage: node template/build-template.mjs  -> template/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CONFIG = 'Configure Job Search';
const TITLE = 'Collect job postings from Greenhouse, Ashby and Lever to Google Sheets';

const src = (f) => readFileSync(join(here, '..', 'src', f), 'utf8')
  .replaceAll("$('Build Config')", `$('${CONFIG}')`)
  .replaceAll('Build Config', CONFIG);

const filterCode = src('filter-rank-cap.js').replace(
  "  const maxAge = cfg.max_age_days?.[j.tier];\n  if (maxAge != null && ",
  "  // 0 = no limit. Company boards default to 0: a live ATS listing is an open role.\n" +
  "  const maxAge = j.tier === 'company' ? cfg.max_age_company_days : cfg.max_age_aggregate_days;\n" +
  "  if (maxAge > 0 && ");
if (!filterCode.includes('max_age_company_days')) throw new Error('filter patch failed');

const uuid = (name) => {
  const h = createHash('sha1').update(`tpl-applications:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const YELLOW = 1, NEUTRAL = 7;
const HTTP_RESILIENCE = { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000, onError: 'continueRegularOutput', alwaysOutputData: true };

const code = (name, jsCode, position, extra = {}) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.code', typeVersion: 2, position,
  parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode }, ...extra
});
const http = (name, position, parameters) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position,
  parameters: { method: 'GET', options: { timeout: 30000 }, ...parameters }, ...HTTP_RESILIENCE
});
// Document is left empty for the user to pick; the tab name is a fixed value.
const sheetRef = (tab) => ({
  documentId: { __rl: true, mode: 'list', value: '' },
  sheetName: { __rl: true, mode: 'name', value: tab }
});
const sheetAppend = (name, position, tab, extra = {}) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position,
  parameters: {
    resource: 'sheet', operation: 'append', ...sheetRef(tab),
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [],
               attemptToConvertTypes: false, convertFieldsToString: false },
    options: { cellFormat: 'RAW', handlingExtraData: 'error' }
  },
  ...extra
});
const sticky = (name, position, width, height, color, content) => ({
  id: uuid(name), name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position,
  parameters: { content, width, height, color }
});

// ---- Set Fields: every value a user is expected to change ----------------
// Arrays are expressions so they stay readable and editable in the n8n UI.
const assign = (name, type, value) => ({ id: uuid(`cfg:${name}`), name, type, value });
const arr = (lines) => `={{ ${lines} }}`;
const configNode = {
  id: uuid(CONFIG), name: CONFIG, type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-1080, 520],
  parameters: {
    assignments: { assignments: [
      assign('filters', 'array', arr(`[
  { name: 'AI / ML Engineer',
    include: ['ai engineer', 'ml engineer', 'machine learning', 'llm', 'genai', 'generative ai', 'ai/ml', 'applied scientist', 'ai infrastructure'],
    exclude: ['intern', 'internship', 'unpaid', 'principal', 'director', 'vp', 'head of'] },
  { name: 'Software Developer',
    include: ['software engineer', 'software developer', 'full stack', 'fullstack', 'full-stack', 'backend', 'back end', 'frontend', 'front end', 'platform engineer'],
    exclude: ['intern', 'internship', 'principal', 'director', 'vp', 'head of', 'engineering manager'] },
  { name: 'Automation / Solutions',
    include: ['automation engineer', 'integration engineer', 'solutions engineer', 'solutions architect', 'forward deployed', 'technical account manager', 'sales engineer', 'implementation engineer'],
    exclude: ['intern', 'internship', 'account executive', 'director', 'vp', 'head of'] }
]`)),
      assign('greenhouse_boards', 'array', arr(`[
  { company: 'Anthropic', token: 'anthropic' },
  { company: 'Databricks', token: 'databricks' },
  { company: 'Figma', token: 'figma' },
  { company: 'Discord', token: 'discord' },
  { company: 'Klaviyo', token: 'klaviyo' },
  { company: 'Robinhood', token: 'robinhood' }
]`)),
      assign('ashby_boards', 'array', arr(`[
  { company: 'OpenAI', board: 'openai' },
  { company: 'n8n', board: 'n8n' },
  { company: 'Ramp', board: 'ramp' },
  { company: 'Linear', board: 'linear' },
  { company: 'Vanta', board: 'vanta' },
  { company: 'Benchling', board: 'benchling' }
]`)),
      assign('lever_boards', 'array', arr(`[
  { company: 'Palantir', slug: 'palantir' }
]`)),
      assign('location_us_explicit', 'array', arr(`['united states', 'usa', 'u.s.', 'u.s.a.', 'us', 'north america', 'northern america', 'americas']`)),
      assign('location_block', 'array', arr(`['emea', 'europe', 'apac', 'latam', 'latin america', 'asia', 'africa', 'oceania', 'middle east',
  'canada', 'mexico', 'brazil', 'argentina', 'colombia', 'chile', 'peru', 'uk', 'united kingdom', 'england',
  'ireland', 'germany', 'france', 'spain', 'portugal', 'italy', 'netherlands', 'belgium', 'switzerland',
  'austria', 'poland', 'ukraine', 'romania', 'serbia', 'sweden', 'norway', 'denmark', 'finland', 'israel',
  'india', 'pakistan', 'philippines', 'singapore', 'japan', 'korea', 'south korea', 'china', 'taiwan',
  'vietnam', 'indonesia', 'australia', 'new zealand', 'nigeria', 'kenya', 'south africa', 'turkey', 'uae',
  'london', 'dublin', 'paris', 'berlin', 'munich', 'amsterdam', 'zurich', 'zürich', 'stockholm', 'warsaw',
  'krakow', 'belgrade', 'tel aviv', 'toronto', 'vancouver', 'montreal', 'bengaluru', 'bangalore', 'mumbai',
  'hyderabad', 'pune', 'delhi', 'tokyo', 'seoul', 'sydney', 'melbourne', 'sao paulo', 'são paulo']`)),
      assign('location_allow', 'array', arr(`['remote', 'anywhere', 'worldwide',
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida',
  'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine',
  'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska',
  'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas',
  'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia',
  'san francisco', 'bay area', 'silicon valley', 'nyc', 'boston', 'seattle', 'austin', 'chicago', 'los angeles',
  'denver', 'atlanta', 'miami', 'palo alto', 'mountain view', 'menlo park', 'sunnyvale', 'san jose', 'san mateo',
  'redwood city', 'san diego', 'bellevue', 'pittsburgh', 'philadelphia', 'washington dc', 'washington, d.c.',
  'salt lake city', 'portland', 'dallas', 'houston', 'raleigh', 'detroit', 'minneapolis', 'nashville', 'phoenix']`)),
      assign('us_state_codes', 'array', arr(`['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
  'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']`)),
      assign('max_results', 'number', 100),
      assign('max_per_company', 'number', 15),
      assign('min_aggregate_slots', 'number', 0),
      assign('match_in', 'string', 'title'),
      assign('max_age_company_days', 'number', 0),
      assign('max_age_aggregate_days', 'number', 30),
      assign('min_desc_len', 'number', 40),
      assign('desc_max_chars', 'number', 900),
      assign('url_id_params', 'array', arr(`['gh_jid', 'jobid', 'job_id', 'jid', 'id', 'posting_id', 'postingid', 'reqid', 'req_id']`)),
      assign('run_at', 'string', "={{ $now.toFormat('yyyy-MM-dd HH:mm ZZZZ') }}"),
      assign('run_date', 'string', "={{ $now.toFormat('yyyy-MM-dd') }}")
    ] },
    options: {}
  }
};

const DESCRIPTION = `# ${TITLE}

## Who's it for
Job seekers, recruiters and career coaches who want one de-duplicated list of new openings from the companies they care about, without scraping or paid APIs.

## How it works
1. Every 3 days the workflow reads your Google Sheet to learn which jobs you already saved.
2. It pulls open roles from each company's **Greenhouse**, **Ashby** or **Lever** job board, plus **Remotive**, **RemoteOK** and **Jobicy**.
3. Postings are normalized, then filtered by your role keywords and locations. Stale and duplicate posts are dropped, company boards are ranked first, and the run is capped.
4. New jobs go to the **Applications** tab and a health summary to **Run Log**, even when nothing new is found.

## How to set up
1. Create a Google Sheet with tabs **Applications** and **Run Log**, and paste the headers from the *Sheet headers* note.
2. On the three Google Sheets nodes, add your credential and pick the spreadsheet.
3. Edit **Configure Job Search**, then click **Execute workflow**.

## Requirements
- A Google Sheets OAuth2 credential. The job sources need no API keys.

## How to customize the workflow
- **Companies:** add \`{ company, token }\` to a board list in **Configure Job Search**.
- **Roles:** add a group to \`filters\`.
- **Locations and caps:** edit the location lists, caps and age limits there too.

Please keep the job links from Remotive, RemoteOK and Jobicy intact. Their terms ask for attribution.`;

const Y = 520;
const nodes = [
  sticky('Template description', [-2180, -160], 760, 1000, YELLOW, DESCRIPTION),
  sticky('Sheet headers', [-2180, 880], 760, 340, NEUTRAL,
`## Sheet headers
Paste each line into cell **A1** of its tab. The cells are tab-separated, so each line fills one row. Keep the names exactly as written (lowercase).

**Applications**
\`\`\`
s.no	company name	job posting link	job role	job description	day posted	location	matched filter	source	added on
\`\`\`
**Run Log**
\`\`\`
run at	sources ok	dead sources	dead company boards	jobs collected	rows appended	sheet total after run	top locations	role breakdown
\`\`\``),
  sticky('Step 1: Configure and read the sheet', [-1380, -160], 900, 1380, NEUTRAL,
`## ① Configure, then read before writing
**Configure Job Search** holds every setting: role filter groups, company boards, location lists, caps and age limits.

**How matching works**
- Keywords match **whole words**, case-insensitive, with an optional plural "s". So \`intern\` does not match "internal".
- A job is kept if it hits one \`include\` word of any group and none of that group's \`exclude\` words.
- **Locations** are split on \`;\` \`|\` \`•\` and "or".
  - A segment passes if it names the US explicitly.
  - Otherwise it passes if it hits no block term and does hit an allow term or a \`, XX\` state code.
  - Empty locations pass.
- \`0\` in an age field means no limit.

**Read Applications** loads the rows you already have, and **Index Existing Rows** turns them into a list of saved links plus the next \`s.no\`. If the sheet can't be read, the run **stops on purpose**, so it never re-adds jobs you already have.`),
  sticky('Step 2a: Company career boards', [-420, -160], 700, 700, NEUTRAL,
`## ②a Company career boards
Greenhouse, Ashby and Lever publish each company's open jobs as public JSON. No key and no scraping. One request is made per company in your lists.

**Check a token before adding it:**
- \`boards-api.greenhouse.io/v1/boards/<token>/jobs\`
- \`api.ashbyhq.com/posting-api/job-board/<board>\`
- \`api.lever.co/v0/postings/<slug>?mode=json\`

JSON with jobs in it means the token is good. A 404 or an empty list means it's wrong.

Each request retries 3 times and continues on error. A dead board is named in the Run Log.`),
  sticky('Step 2b: Remote job boards', [-420, 580], 700, 640, NEUTRAL,
`## ②b Remote job boards
**Remotive**, **RemoteOK** and **Jobicy** (filtered to the USA) add broad remote coverage. They're free and need no key.

Same safety net: 3 retries, continue on error, and dead sources are named in the Run Log.

Remotive asks for at most 4 calls a day. The every-3-days schedule stays well inside that.`),
  sticky('Step 3: Merge and normalize', [320, -160], 460, 1380, NEUTRAL,
`## ③ Merge and normalize
Six different response shapes become one:
\`tier, board, source, company, title, url, description, posted_date, location\`

- HTML tags and entities are stripped. Some boards encode them twice, so they're decoded twice.
- ISO dates, "YYYY-MM-DD HH:mm:ss", unix seconds and unix milliseconds all become \`YYYY-MM-DD\`.

Nothing to edit here.`),
  sticky('Step 4: Filter, rank and cap', [820, -160], 460, 1380, NEUTRAL,
`## ④ Filter, rank and cap
**Order:** required fields → description length → valid date → age → role → location → duplicates within the run → already in your sheet.

Then company boards are ranked first, newest first. Each company is capped at \`max_per_company\` and the run at \`max_results\`. Extra jobs are picked up on the next run.

**Duplicate check:** links are normalized first, so tracking parameters like \`utm_*\` don't create false "new" jobs, while the IDs that identify a posting (\`gh_jid\`) are kept.

This step outputs a single item with \`rows\` and \`stats\`, so a run with zero matches still reaches the Run Log.`),
  sticky('Step 5: Write to Google Sheets', [1320, -160], 960, 1380, NEUTRAL,
`## ⑤ Write to Google Sheets
**Applications:** one row per new job.

**Run Log:** one row per run, **always written**, even when nothing new was found. That's the run where it matters most, because "no new jobs" and "every board was down" look the same in the Applications tab.

\`rows appended\` counts what Google actually accepted. A failed append is named in \`dead sources\` instead of stopping the log.`),

  { id: uuid('Every 3 Days'), name: 'Every 3 Days', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2,
    position: [-1300, Y],
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 3, triggerAtHour: 9, triggerAtMinute: 0 }] } } },
  configNode,
  { id: uuid('Read Applications'), name: 'Read Applications', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5,
    position: [-860, Y],
    parameters: { resource: 'sheet', operation: 'read', ...sheetRef('Applications'), options: {} },
    alwaysOutputData: true },
  code('Index Existing Rows', src('index-existing-rows.js'), [-640, Y]),

  code('Greenhouse Targets', src('targets-greenhouse.js'), [-340, 20], { alwaysOutputData: true }),
  http('Greenhouse Boards', [-120, 20], { url: '=https://boards-api.greenhouse.io/v1/boards/{{ $json.token }}/jobs?content=true' }),
  code('Map Greenhouse', src('map-greenhouse.js'), [100, 20]),
  code('Ashby Targets', src('targets-ashby.js'), [-340, 220], { alwaysOutputData: true }),
  http('Ashby Boards', [-120, 220], { url: '=https://api.ashbyhq.com/posting-api/job-board/{{ $json.board }}?includeCompensation=false' }),
  code('Map Ashby', src('map-ashby.js'), [100, 220]),
  code('Lever Targets', src('targets-lever.js'), [-340, 420], { alwaysOutputData: true }),
  http('Lever Boards', [-120, 420], { url: '=https://api.lever.co/v0/postings/{{ $json.slug }}?mode=json' }),
  code('Map Lever', src('map-lever.js'), [100, 420]),

  http('Remotive API', [-120, 700], {
    url: 'https://remotive.com/api/remote-jobs', sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: [{ name: 'limit', value: '100' }] } }),
  code('Map Remotive', src('map-remotive.js'), [100, 700]),
  http('RemoteOK API', [-120, 880], {
    url: 'https://remoteok.com/api', sendHeaders: true, specifyHeaders: 'keypair',
    headerParameters: { parameters: [{ name: 'User-Agent', value: 'n8n-job-search-template/1.0' }] } }),
  code('Map RemoteOK', src('map-remoteok.js'), [100, 880]),
  http('Jobicy API', [-120, 1060], {
    url: 'https://jobicy.com/api/v2/remote-jobs', sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: [{ name: 'count', value: '100' }, { name: 'geo', value: 'usa' }] } }),
  code('Map Jobicy', src('map-jobicy.js'), [100, 1060]),

  { id: uuid('Merge All Sources'), name: 'Merge All Sources', type: 'n8n-nodes-base.merge', typeVersion: 3.2,
    position: [400, Y], parameters: { mode: 'append', numberInputs: 6 } },
  code('Normalize Jobs', src('normalize-jobs.js'), [620, Y]),
  code('Filter, Rank & Cap', filterCode, [900, Y]),
  { id: uuid('Any New Jobs?'), name: 'Any New Jobs?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [1120, Y],
    parameters: { conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{ id: uuid('cond:rows>0'), leftValue: '={{ $json.rows.length }}', rightValue: 0,
                     operator: { type: 'number', operation: 'gt' } }],
      combinator: 'and' }, options: {} } },
  { id: uuid('Split Rows'), name: 'Split Rows', type: 'n8n-nodes-base.splitOut', typeVersion: 1, position: [1380, 400],
    parameters: { fieldToSplitOut: 'rows', include: 'noOtherFields', options: {} } },
  sheetAppend('Append to Applications', [1600, 400], 'Applications', { onError: 'continueRegularOutput' }),
  code('Build Run Log', src('build-run-log.js'), [1860, 660]),
  sheetAppend('Append to Run Log', [2080, 660], 'Run Log')
];

const link = (to, index = 0) => ({ node: to, type: 'main', index });
const connections = {
  'Every 3 Days':        { main: [[link(CONFIG)]] },
  [CONFIG]:              { main: [[link('Read Applications')]] },
  'Read Applications':   { main: [[link('Index Existing Rows')]] },
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
  'Append to Applications': { main: [[link('Build Run Log')]] },
  'Build Run Log':       { main: [[link('Append to Run Log')]] }
};

// ---- n8n house style (matches the Creator Portal AI review) --------------
// The portal's AI renamed nodes and regrouped the stickies; we adopt that
// structure here, and fix what its rewrite broke: Remotive/Jobicy nodes
// overlapping, the empty Remotive sticky, the dropped header rows and
// attribution, and comments still naming the old nodes.
const RENAME = {
  'Every 3 Days': 'When Every 3 Days',
  [CONFIG]: 'Set Job Search Criteria',
  'Read Applications': 'Read from Google Sheets',
  'Index Existing Rows': 'Index Saved Job Data',
  'Greenhouse Targets': 'Distribute Greenhouse Boards', 'Greenhouse Boards': 'Fetch Greenhouse Jobs', 'Map Greenhouse': 'Transform Greenhouse Data',
  'Ashby Targets': 'Distribute Ashby Boards', 'Ashby Boards': 'Fetch Ashby Jobs', 'Map Ashby': 'Transform Ashby Data',
  'Lever Targets': 'Distribute Lever Boards', 'Lever Boards': 'Fetch Lever Jobs', 'Map Lever': 'Transform Lever Data',
  'Remotive API': 'Fetch Remotive Jobs', 'Map Remotive': 'Transform Remotive Data',
  'RemoteOK API': 'Fetch RemoteOK Jobs', 'Map RemoteOK': 'Transform RemoteOK Data',
  'Jobicy API': 'Fetch Jobicy Jobs', 'Map Jobicy': 'Transform Jobicy Data',
  'Merge All Sources': 'Merge All Job Sources',
  'Normalize Jobs': 'Normalize Job Data',
  'Filter, Rank & Cap': 'Filter and Rank Job Listings',
  'Any New Jobs?': 'Check for New Jobs',
  'Split Rows': 'Split Job Listings',
  'Append to Applications': 'Append Jobs to Google Sheets',
  'Build Run Log': 'Generate Run Log Entry',
  'Append to Run Log': 'Append to Run Log in Sheets'
};
// Two-step swap through placeholders, so "Greenhouse Boards" inside
// "Distribute Greenhouse Boards" is never rewritten twice.
const oldNames = Object.keys(RENAME).sort((a, b) => b.length - a.length);
const renameText = (t) => {
  let out = t;
  oldNames.forEach((o, i) => { out = out.split(o).join(`\u0000${i}\u0000`); });
  oldNames.forEach((o, i) => { out = out.split(`\u0000${i}\u0000`).join(RENAME[o]); });
  return out;
};
const POS = {
  'Distribute Ashby Boards': [-336, 368], 'Fetch Ashby Jobs': [-112, 368], 'Transform Ashby Data': [96, 368],
  'Distribute Lever Boards': [-336, 688], 'Fetch Lever Jobs': [-112, 688], 'Transform Lever Data': [96, 688],
  'Fetch Remotive Jobs': [-112, 1040], 'Transform Remotive Data': [96, 1040],
  'Fetch Jobicy Jobs': [-112, 1376], 'Transform Jobicy Data': [96, 1376],
  'Fetch RemoteOK Jobs': [-112, 1744], 'Transform RemoteOK Data': [96, 1744]
};
const realNodes = nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').map((n) => {
  const m = { ...n, name: RENAME[n.name] ?? n.name, position: POS[RENAME[n.name] ?? n.name] ?? n.position };
  if (m.parameters?.jsCode) m.parameters = { ...m.parameters, jsCode: renameText(m.parameters.jsCode) };
  return m;
});
const renamedConnections = Object.fromEntries(Object.entries(connections).map(([from, c]) =>
  [RENAME[from] ?? from, { main: c.main.map((out) => out.map((l) => ({ ...l, node: RENAME[l.node] ?? l.node }))) }]));

const APP_HEADERS = 's.no\tcompany name\tjob posting link\tjob role\tjob description\tday posted\tlocation\tmatched filter\tsource\tadded on';
const LOG_HEADERS = 'run at\tsources ok\tdead sources\tdead company boards\tjobs collected\trows appended\tsheet total after run\ttop locations\trole breakdown';
const OVERVIEW = `## ${TITLE}

### How it works

1. Runs every three days and reads the **Applications** tab so jobs you already saved are never added twice.
2. Requests each configured **Greenhouse**, **Ashby** and **Lever** job board, plus the **Remotive**, **RemoteOK** and **Jobicy** feeds.
3. Maps every source into one job format, then cleans HTML and converts all dates to YYYY-MM-DD.
4. Keeps jobs matching your role keywords and locations, drops stale and duplicate posts, ranks company boards first and caps the run.
5. Appends new jobs to **Applications** and one summary row to **Run Log**, even when nothing new is found.

### Setup steps

- [ ] Create a Google Sheet with the tabs **Applications** and **Run Log**, and paste these headers into row 1 (tab-separated, lowercase):

**Applications**
\`\`\`
${APP_HEADERS}
\`\`\`
**Run Log**
\`\`\`
${LOG_HEADERS}
\`\`\`
- [ ] Connect a Google Sheets credential and pick your spreadsheet in the three Google Sheets nodes.
- [ ] Edit **Set Job Search Criteria**: role filters, locations, and the Greenhouse, Ashby and Lever board lists.
- [ ] Click **Execute workflow** to test, then activate the workflow.

### Customization

Add a company by adding \`{ company, token }\` to a board list. Check the board URL in a browser first. Add a role by adding a group to \`filters\`. Change the schedule in **When Every 3 Days**.

Keep the Remotive, RemoteOK and Jobicy job links intact. Their terms require attribution.`;

const group = (name, position, width, height, title, body) =>
  sticky(name, position, width, height, NEUTRAL, `## ${title}\n\n${body}`);
const houseStickies = [
  { ...sticky('Sticky Note', [-1904, -112], 480, 1200, YELLOW, OVERVIEW), parameters: { content: OVERVIEW, width: 480, height: 1200 } },
  group('Sticky Note1', [-1344, 384], 848, 304, 'Schedule and initialize',
    'Starts every three days, loads the search settings, reads the Applications tab and indexes saved job links and serial numbers.'),
  group('Sticky Note2', [-384, -112], 640, 304, 'Fetch Greenhouse jobs',
    'One request per configured Greenhouse board, mapped into the shared job format. Failures are logged and skipped.'),
  group('Sticky Note3', [-384, 224], 640, 304, 'Fetch Ashby jobs',
    'One request per configured Ashby board, mapped into the shared job format. An empty board is reported as dead.'),
  group('Sticky Note4', [-384, 560], 640, 304, 'Fetch Lever jobs',
    'One request per configured Lever board, mapped into the shared job format.'),
  group('Sticky Note5', [-160, 896], 416, 320, 'Fetch Remotive jobs',
    'Calls the Remotive remote jobs API (max 4 calls a day) and maps it into the shared job format.'),
  group('Sticky Note6', [-160, 1248], 416, 304, 'Fetch Jobicy jobs',
    'Fetches US remote jobs from Jobicy and maps them into the shared job format.'),
  group('Sticky Note7', [-160, 1584], 416, 320, 'Fetch RemoteOK jobs',
    'Fetches the RemoteOK feed, skips its legal notice and maps the jobs into the shared job format.'),
  group('Sticky Note8', [352, 368], 416, 448, 'Merge and normalize',
    'Combines all six sources and cleans HTML, dates and text, so the filters see one consistent schema.'),
  group('Sticky Note9', [848, 368], 416, 320, 'Filter and decide',
    'Applies role, location and age filters, removes duplicates, ranks and caps the jobs, then checks whether any are new.'),
  group('Sticky Note10', [1328, 240], 416, 320, 'Append new applications',
    'Splits the selected jobs into rows and appends them to the Applications tab.'),
  group('Sticky Note11', [1808, 496], 416, 320, 'Write run log',
    'Builds one summary row per run and appends it to the Run Log tab, including runs with no new jobs.')
];
nodes.splice(0, nodes.length, ...houseStickies, ...realNodes);
for (const k of Object.keys(connections)) delete connections[k];
Object.assign(connections, renamedConnections);

const workflow = { name: TITLE, nodes, connections, settings: { executionOrder: 'v1' } };

const file = join(here, 'collect-job-postings-greenhouse-ashby-lever-google-sheets.json');
writeFileSync(file, JSON.stringify(workflow, null, 2) + '\n');
writeFileSync(join(here, 'description.md'), DESCRIPTION.replace(/^# .*\n\n/, '') + '\n');
console.log(`wrote ${file}: ${nodes.length} nodes`);
