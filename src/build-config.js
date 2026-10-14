// ===================================================================
//  CONTROL PANEL - the only node you should need to edit.
//  Everything below is data: adding a role, a company or a location
//  means editing an array, never the filter logic downstream.
// ===================================================================

// The Google Sheet (document + tab) is set directly on the three Sheets
// nodes - Read Applications, Append to Applications, Append to Run Log -
// not here. The n8n editor clears a tab chosen by expression whenever the
// node is opened, so those fields must hold fixed values.

// --- 1. ROLE FILTERS -------------------------------------------------
// A job is kept if it matches ANY group. Inside a group it must hit one
// 'include' term and no 'exclude' term. Terms match whole words
// (case-insensitive, optional trailing "s"), so 'intern' does not match
// "internal" and 'llm' does match "LLMs".
// Groups are tried in order; the first match becomes 'matched filter'.
const FILTERS = [
  {
    name: 'AI / ML Engineer',
    include: ['ai engineer', 'ml engineer', 'machine learning', 'llm', 'genai', 'generative ai', 'ai/ml',
              'applied scientist', 'ai infrastructure'],
    exclude: ['intern', 'internship', 'unpaid', 'principal', 'director', 'vp', 'head of']
  },
  {
    name: 'Software Developer',
    include: ['software engineer', 'software developer', 'full stack', 'fullstack', 'full-stack', 'backend',
              'back end', 'frontend', 'front end', 'platform engineer'],
    exclude: ['intern', 'internship', 'principal', 'director', 'vp', 'head of', 'engineering manager']
  },
  {
    name: 'Automation / Solutions',
    include: ['automation engineer', 'integration engineer', 'solutions engineer', 'solutions architect',
              'forward deployed', 'technical account manager', 'sales engineer', 'implementation engineer'],
    exclude: ['intern', 'internship', 'account executive', 'director', 'vp', 'head of']
  }
];

// --- 2. LOCATION RULES -----------------------------------------------
// A location string is split into segments on ; | • and " or ", because
// boards list multi-city roles as "San Francisco, CA; London, UK". The job
// passes if ANY segment passes. Per segment, in this order:
//   a) mentions a term in LOCATION_US_EXPLICIT        -> pass (beats block)
//   b) mentions a term in LOCATION_BLOCK              -> fail
//   c) mentions LOCATION_ALLOW or ", <state code>"    -> pass
// Explicit-US beats block so "USA, UK, India" (Remotive's list of where
// candidates may live) still passes for a US resident.
// An empty location passes - several boards omit it on remote-only roles.
const LOCATION_US_EXPLICIT = [
  'united states', 'usa', 'u.s.', 'u.s.a.', 'us', 'north america', 'northern america', 'americas'
];
const LOCATION_BLOCK = [
  // regions
  'emea', 'europe', 'apac', 'latam', 'latin america', 'asia', 'africa', 'oceania', 'middle east',
  // countries
  'canada', 'mexico', 'brazil', 'argentina', 'colombia', 'chile', 'peru', 'uk', 'united kingdom', 'england',
  'ireland', 'germany', 'france', 'spain', 'portugal', 'italy', 'netherlands', 'belgium', 'switzerland',
  'austria', 'poland', 'ukraine', 'romania', 'serbia', 'sweden', 'norway', 'denmark', 'finland', 'israel',
  'india', 'pakistan', 'philippines', 'singapore', 'japan', 'korea', 'south korea', 'china', 'taiwan',
  'vietnam', 'indonesia', 'australia', 'new zealand', 'nigeria', 'kenya', 'south africa', 'turkey', 'uae',
  // big non-US tech cities that often appear without a country
  'london', 'dublin', 'paris', 'berlin', 'munich', 'amsterdam', 'zurich', 'zürich', 'stockholm', 'warsaw',
  'krakow', 'belgrade', 'tel aviv', 'toronto', 'vancouver', 'montreal', 'bengaluru', 'bangalore', 'mumbai',
  'hyderabad', 'pune', 'delhi', 'tokyo', 'seoul', 'sydney', 'melbourne', 'sao paulo', 'são paulo'
];
const LOCATION_ALLOW = [
  'remote', 'anywhere', 'worldwide',
  // US states (names)
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida',
  'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine',
  'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska',
  'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas',
  'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia',
  // US metros that boards print without a state
  'san francisco', 'bay area', 'silicon valley', 'nyc', 'boston', 'seattle', 'austin', 'chicago', 'los angeles',
  'denver', 'atlanta', 'miami', 'palo alto', 'mountain view', 'menlo park', 'sunnyvale', 'san jose', 'san mateo',
  'redwood city', 'san diego', 'bellevue', 'pittsburgh', 'philadelphia', 'washington dc', 'washington, d.c.',
  'salt lake city', 'portland', 'dallas', 'houston', 'raleigh', 'detroit', 'minneapolis', 'nashville', 'phoenix'
];
// Matched case-sensitively as ", XX" - "Boston, MA", "Austin, TX".
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
  'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// --- 3. COMPANY CAREER BOARDS ----------------------------------------
// Highest-signal sources: each company's own ATS, public and keyless.
// Verify a token before adding it - paste the URL into a browser:
//   Greenhouse  boards-api.greenhouse.io/v1/boards/<token>/jobs
//   Ashby       api.ashbyhq.com/posting-api/job-board/<board>
//   Lever       api.lever.co/v0/postings/<slug>?mode=json
// JSON with jobs in it = good. 404 or an empty list = wrong token.
// An empty array disables that ATS family.
const GREENHOUSE_BOARDS = [
  { company: 'Anthropic',  token: 'anthropic'  },
  { company: 'Databricks', token: 'databricks' },
  { company: 'Figma',      token: 'figma'      },
  { company: 'Discord',    token: 'discord'    },
  { company: 'Klaviyo',    token: 'klaviyo'    },
  { company: 'Robinhood',  token: 'robinhood'  }
];
const ASHBY_BOARDS = [
  { company: 'OpenAI',    board: 'openai'    },
  { company: 'n8n',       board: 'n8n'       },
  { company: 'Ramp',      board: 'ramp'      },
  { company: 'Linear',    board: 'linear'    },
  { company: 'Vanta',     board: 'vanta'     },
  { company: 'Benchling', board: 'benchling' }
];
const LEVER_BOARDS = [
  { company: 'Palantir', slug: 'palantir' }
];

// --- 4. RUN SETTINGS -------------------------------------------------
const MAX_RESULTS          = 100;     // hard cap on rows appended per run
const MAX_PER_COMPANY      = 15;      // stops one big board taking every slot; extras roll to later runs
const MIN_AGGREGATE_SLOTS  = 0;       // reserve N of MAX_RESULTS for aggregate boards (0 = strict ranking)
const MATCH_IN             = 'title'; // 'title' (precise) | 'title_and_description' (wider, noisier)
const MAX_AGE_DAYS = {
  company:   null,  // null = no limit: a live ATS listing is an open role, whatever its first-posted date
  aggregate: 30     // aggregate boards keep stale listings around, so age them out
};
const MIN_DESC_LEN   = 40;    // drop listings whose description is basically empty
const DESC_MAX_CHARS = 900;   // description is trimmed to this for the sheet

// Query parameters that identify a posting and must survive URL
// normalisation. Everything else (utm_*, gh_src, ref...) is tracking and
// is stripped. Databricks serves all 886 jobs from one path and tells
// them apart only by ?gh_jid=, so stripping the whole query is not safe.
const URL_ID_PARAMS = ['gh_jid', 'jobid', 'job_id', 'jid', 'id', 'posting_id', 'postingid', 'reqid', 'req_id'];
// ===================================================================


console.log(`[config] ${FILTERS.length} role groups | boards: ${GREENHOUSE_BOARDS.length} Greenhouse, ` +
            `${ASHBY_BOARDS.length} Ashby, ${LEVER_BOARDS.length} Lever | cap ${MAX_RESULTS}/run, ` +
            `${MAX_PER_COMPANY}/company`);

return [{
  json: {
    filters: FILTERS,
    location_us_explicit: LOCATION_US_EXPLICIT,
    location_block: LOCATION_BLOCK,
    location_allow: LOCATION_ALLOW,
    us_state_codes: US_STATE_CODES,
    greenhouse_boards: GREENHOUSE_BOARDS,
    ashby_boards: ASHBY_BOARDS,
    lever_boards: LEVER_BOARDS,
    max_results: MAX_RESULTS,
    max_per_company: MAX_PER_COMPANY,
    min_aggregate_slots: MIN_AGGREGATE_SLOTS,
    match_in: MATCH_IN,
    max_age_days: MAX_AGE_DAYS,
    min_desc_len: MIN_DESC_LEN,
    desc_max_chars: DESC_MAX_CHARS,
    url_id_params: URL_ID_PARAMS,
    // Local wall-clock time in the workflow's timezone, so 'added on' is the
    // date you'd expect rather than a UTC date that can be a day off.
    run_at: $now.toFormat('yyyy-MM-dd HH:mm ZZZZ'),
    run_date: $now.toFormat('yyyy-MM-dd')
  }
}];
