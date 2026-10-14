// Jobicy -> unified job shape. The request already asks for geo=usa, so this
// board is pre-filtered server-side; the location rules still run on it.
const SOURCE = 'Jobicy';
const res = $input.first()?.json ?? {};
const jobs = Array.isArray(res.jobs) ? res.jobs : [];

if (res.error || !jobs.length) {
  console.log(`[${SOURCE}] unavailable${res.error ? ' (request failed)' : ' (no jobs in response)'}`);
  return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'aggregate', status: 'unavailable', count: 0 } }];
}

const out = jobs.map(j => ({ json: {
  _kind: 'job', tier: 'aggregate', board: SOURCE, source: SOURCE,
  company: j.companyName ?? '',
  title: j.jobTitle ?? '',
  url: j.url ?? '',                               // jobicy.com link - satisfies their credit term
  description_raw: j.jobDescription || j.jobExcerpt || '',
  posted_raw: j.pubDate ?? '',
  location: j.jobGeo ?? ''
}}));

console.log(`[${SOURCE}] ${out.length} jobs`);
return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'aggregate', status: 'ok', count: out.length } }, ...out];
