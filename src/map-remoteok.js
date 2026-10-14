// RemoteOK -> unified job shape. The API returns a bare array that the HTTP
// node splits into items; the first element is a legal notice, not a job,
// so anything carrying a 'legal' field or lacking a position is skipped.
const SOURCE = 'RemoteOK';
const items = $input.all().map(i => i.json ?? {});
const failed = items.length === 1 && items[0].error;
const jobs = items.filter(j => !j.legal && !j.error && (j.position || j.title));

if (failed || !jobs.length) {
  console.log(`[${SOURCE}] unavailable${failed ? ' (request failed)' : ' (no jobs in response)'}`);
  return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'aggregate', status: 'unavailable', count: 0 } }];
}

const out = jobs.map(j => ({ json: {
  _kind: 'job', tier: 'aggregate', board: SOURCE, source: SOURCE,
  company: j.company ?? '',
  title: j.position ?? j.title ?? '',
  url: j.url ?? j.apply_url ?? '',                // remoteok.com link - satisfies their link-back term
  description_raw: j.description ?? '',
  posted_raw: j.date ?? j.epoch ?? '',            // ISO string, with unix seconds as fallback
  location: j.location ?? ''                      // often blank; blank locations pass the filter
}}));

console.log(`[${SOURCE}] ${out.length} jobs`);
return [{ json: { _kind: 'source_status', source: SOURCE, tier: 'aggregate', status: 'ok', count: out.length } }, ...out];
