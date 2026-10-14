// Remotive -> unified job shape. Remotive's free feed is delayed 24h and
// asks for at most 4 calls a day; every 3 days is well inside that.
const SOURCE = 'Remotive';
const res = $input.first()?.json ?? {};
const jobs = Array.isArray(res.jobs) ? res.jobs : [];

if (res.error || !jobs.length) {
  console.log(`[${SOURCE}] unavailable${res.error ? ' (request failed)' : ' (no jobs in response)'}`);
  return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'aggregate', status: 'unavailable', count: 0 } }];
}

const out = jobs.map(j => ({ json: {
  _kind: 'job', tier: 'aggregate', board: SOURCE, source: SOURCE,
  company: j.company_name ?? '',
  title: j.title ?? '',
  url: j.url ?? '',                               // remotive.com link - satisfies their link-back term
  description_raw: j.description ?? '',
  posted_raw: j.publication_date ?? '',
  location: j.candidate_required_location ?? ''
}}));

console.log(`[${SOURCE}] ${out.length} jobs`);
return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'aggregate', status: 'ok', count: out.length } }, ...out];
