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
- **Companies:** add `{ company, token }` to a board list in **Configure Job Search**.
- **Roles:** add a group to `filters`.
- **Locations and caps:** edit the location lists, caps and age limits there too.

Please keep the job links from Remotive, RemoteOK and Jobicy intact. Their terms ask for attribution.
