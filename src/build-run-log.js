// One row per execution for the 'Run Log' tab: the health check you can read
// without opening n8n. This node is reached by exactly one of two paths:
//   - Append to Applications -> here           (there were new jobs)
//   - Any New Jobs? (false) -> here      (zero new jobs - the run you most
//                                         need logged, because "nothing new"
//                                         and "every board died" look alike)
// 'rows appended' is what the Sheets node actually returned, not what we
// intended to write. Append to Applications continues on error, so a failed append
// is reported here instead of killing the log too.

const cfg = $('Build Config').first().json;
const { rows, stats } = $('Filter, Rank & Cap').first().json;

let appended = 0;
let appendError = '';
if ($('Append to Applications').isExecuted) {
  const out = $('Append to Applications').all().map(i => i.json);
  const err = out.find(r => r && r.error);
  if (err) {
    const e = err.error;
    appendError = typeof e === 'string' ? e : (e?.message ?? 'unknown error');
  } else {
    appended = out.length;
  }
}
const written = appended ? rows.slice(0, appended) : [];

// Count and render "label (n); label (n)" for the top entries.
const tally = (values, limit) => {
  const c = {};
  for (const v of values) c[v] = (c[v] ?? 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([k, n]) => `${k} (${n})`).join('; ');
};

const sources = stats.sources.filter(s => s.status !== 'disabled');
const okCount = sources.filter(s => s.status === 'ok').length;
const deadSources = sources.filter(s => s.status !== 'ok').map(s => s.source);
if (appendError) deadSources.push(`Applications append FAILED: ${appendError.slice(0, 120)}`);
const deadBoards = sources.flatMap(s => (s.boards ?? []).filter(b => b.status !== 'ok')
  .map(b => `${b.company} (${s.source}, ${b.reason})`));

const log = {
  'run at': cfg.run_at,
  'sources ok': `${okCount}/${sources.length}`,
  'dead sources': deadSources.join('; ') || 'none',
  'dead company boards': deadBoards.join('; ') || 'none',
  'jobs collected': stats.collected,
  'rows appended': appended,
  'sheet total after run': stats.existing_row_count + appended,
  // First segment only, so "NYC | SF | Remote" counts once, as NYC.
  'top locations': tally(written.map(r => String(r.location).split(/\s*[|;•]\s*/)[0] || 'Not stated'), 8) || 'none',
  'role breakdown': tally(written.map(r => r['matched filter']), 10) || 'none'
};

console.log(`[run log] ${log['sources ok']} sources ok | ${stats.collected} collected | ${appended} appended` +
            (appendError ? ` | APPEND FAILED: ${appendError}` : ''));
return [{ json: log }];
