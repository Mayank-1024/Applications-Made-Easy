# Manual setup checklist: "Applications made easy"

Things only you can do. The node names below are exact.

## 1. Google Sheet

- [x] **Spreadsheet file:** named **`Applications Made Easy`**. The workflow finds it by ID, so the file name is just for you; renaming it later won't break anything.
- [ ] **Create a tab named exactly `Applications`.** Paste this into cell **A1**; it's tab-separated, so it fills A1:J1:
  ```
  s.no	company name	job posting link	job role	job description	day posted	location	matched filter	source	added on
  ```
- [ ] **Create a tab named exactly `Run Log`.** Paste this into cell **A1**; it fills A1:I1:
  ```
  run at	sources ok	dead sources	dead company boards	jobs collected	rows appended	sheet total after run	top locations	role breakdown
  ```
- [ ] **Keep the headers exactly as written:** lowercase, single spaces, no trailing spaces. Both append nodes are set to **fail** on any field that has no matching header, so they can't quietly create stray columns. If you rename a header, Applications appends fail and the failure is written into the Run Log's `dead sources` column.
- [ ] **Copy the spreadsheet ID.** It's the part of the URL between `/d/` and `/edit`.

## 2. Sheet on the three Sheets nodes

- [x] Done for your instance: **Read Applications**, **Append to Applications** and **Append to Run Log** have Document = your spreadsheet ID (fixed value) and Sheet = `Applications` / `Run Log`.
- [ ] On a fresh import, set Document (By ID or From list) and Sheet on each of those three nodes. Use **fixed values, not expressions**: the n8n editor clears an expression-driven Sheet field whenever the node is opened.
- [ ] If you ever change the credential on a Sheets node, re-check its Sheet field. The editor resets it on credential change too.

## 3. Google credential (three nodes)

- [ ] Choose your Google Sheets credential on all three Sheets nodes: **`Read Applications`**, **`Append to Applications`** and **`Append to Run Log`**. I didn't attach any credential because the brief said to leave existing credentials alone.
- [ ] If you don't have a Google Sheets credential yet:
  - Create an OAuth client in Google Cloud and enable the **Google Sheets API** and the **Google Drive API**.
  - Set the redirect URI to `https://<your-n8n-host>/rest/oauth2-credential/callback`.
  - In n8n, add a **Google Sheets OAuth2 API** credential and sign in.

## 4. First run (manual, workflow stays inactive)

- [ ] Click **Execute workflow** on the canvas. Expect about 1–2 minutes: 14 board requests, around 3,800 jobs, roughly 50 MB of JSON.
- [ ] Check that **`Applications`** now has up to 100 rows starting at `s.no` 1 and that **`Run Log`** has one row.
- [ ] Tell me when it's done. I'll pull the execution through the API and write up the first-run report. The drop breakdown is in the output of node **`Filter, Rank & Cap`** → `stats.dropped`.
- [ ] Optional: run it a second time straight away. You should get 100 *different* rows (the backlog over the company cap), `already_in_sheet` should be about 100, and `s.no` should continue from 101.

## 5. Before you activate it

- [ ] **Leave the workflow inactive** until you're happy with the rows.
- [ ] **Storage:** every execution stores the full API responses, about 50 MB raw plus copies between nodes. Once you trust it, set **Workflow settings → Save successful production executions → Do not save**. The Run Log covers health monitoring and failed runs are still saved.
- [ ] **Console logs:** the `console.log` lines (per-stage counts) appear in your **browser DevTools console** during manual runs, not in the saved execution. The saved record is the `stats` object in **`Filter, Rank & Cap`** and the Run Log row.

## 6. If you post screenshots publicly

- [ ] **Credit the boards.** Remotive, RemoteOK and Jobicy each require a visible mention plus a link back if their jobs are shown publicly. The `job posting link` column already holds their URLs. Name them in the post or a caption.
- [ ] **Hide private details.** Blur the sheet URL and the n8n hostname.
