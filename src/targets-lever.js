// Fan out one item per Lever board (see Greenhouse Targets for why an empty
// list is safe).
const boards = $('Build Config').first().json.lever_boards ?? [];
console.log(`[lever] requesting ${boards.length} boards`);
return boards.map(b => ({ json: { company: b.company, slug: b.slug } }));
