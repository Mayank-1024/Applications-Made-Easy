// Fan out one item per Ashby board (see Greenhouse Targets for why an empty
// list is safe).
const boards = $('Build Config').first().json.ashby_boards ?? [];
console.log(`[ashby] requesting ${boards.length} boards`);
return boards.map(b => ({ json: { company: b.company, board: b.board } }));
