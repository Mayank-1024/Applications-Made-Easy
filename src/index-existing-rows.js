// Collapse the Applications tab into one item: the links already saved, the next serial
// number and the row count. Two reasons this exists as its own node:
//  1. Read Applications emits one item per row; without collapsing, every source
//     branch downstream would fire once per existing row.
//  2. Raw links are passed on untouched. URL normalisation happens in one
//     place only (Filter, Rank & Cap) so the sheet side and the new-job side
//     can never drift apart and silently break dedupe.
//
// Read Applications has "Always Output Data" on, so an empty sheet arrives here as
// a single {} item rather than stopping the workflow.

const rows = $input.all().map(i => i.json).filter(r => r && Object.keys(r).length > 0);

// Header lookup is case-insensitive so a "Job Posting Link" header still
// dedupes - but the append side needs exact lowercase headers anyway.
const pick = (row, name) => {
  const key = Object.keys(row).find(k => k.trim().toLowerCase() === name);
  return key === undefined ? undefined : row[key];
};

const links = [];
let maxSno = 0;
for (const row of rows) {
  const link = pick(row, 'job posting link');
  if (link) links.push(String(link));
  const n = parseInt(pick(row, 's.no'), 10);
  if (!isNaN(n) && n > maxSno) maxSno = n;
}

console.log(`[sheet] ${rows.length} existing rows | ${links.length} links | next s.no ${maxSno + 1}`);

return [{ json: { existing_links: links, existing_row_count: rows.length, next_sno: maxSno + 1 } }];
