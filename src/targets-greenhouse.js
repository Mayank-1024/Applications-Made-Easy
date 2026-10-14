// Fan out one item per Greenhouse board so the HTTP node makes one request
// per company. If the list is empty this returns nothing; "Always Output
// Data" then sends a single empty item, the request 404s harmlessly, and Map
// Greenhouse reports the family as disabled. That keeps every Merge input
// fed, so the Merge never waits on a branch that didn't run.
const boards = $('Build Config').first().json.greenhouse_boards ?? [];
console.log(`[greenhouse] requesting ${boards.length} boards`);
return boards.map(b => ({ json: { company: b.company, token: b.token } }));
