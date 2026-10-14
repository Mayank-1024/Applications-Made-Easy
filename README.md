# Applications made easy

**Every new job opening from the companies you care about, in one Google Sheet, without scraping or paid APIs.**

An [n8n](https://n8n.io) workflow that runs every 3 days. It collects job postings from free, keyless sources: 13 company career boards on **Greenhouse**, **Ashby** and **Lever**, plus **Remotive**, **RemoteOK** and **Jobicy**. It filters them against rules set in config and appends only new ones to a Google Sheet, without duplicates. Every run also writes a one-row health log, even when nothing new is found.

```
 Every 3 days ─▶ Read saved jobs ─▶ Greenhouse · Ashby · Lever ─▶ Merge ─▶ Normalize ─▶ Filter, rank, cap ─▶ New jobs → Applications
                 (Google Sheets)     Remotive · RemoteOK · Jobicy                                             Health   → Run Log
```

A dry run against real API responses collected **3,773 jobs** and appended the capped 100 rows.

## Files

| File | What it is |
|---|---|
| `applications-made-easy.json` | The workflow (built output). Import this into n8n. The Sheet ID and credentials are placeholders. |
| `src/*.js` | The body of each Code node, one file per node. **Edit these, not the JSON.** |
| `build.mjs` | Assembles the JSON from `src/`, including node wiring and settings: `node build.mjs` |
| `test-local.mjs` | Runs the real Code-node files against saved API responses: `node test-local.mjs <samples-dir> [--existing N] [--dead-board]` |
| `SETUP-CHECKLIST.md` | Manual steps: sheet tabs, headers, credentials, first run. |
| `VERIFICATION-REPORT.md` | Token checks, source counts, and every change from the starting JSON and why. |
| `paid-job-apis.md` | Comparison of paid job APIs, with sources, and why this workflow uses free ones. |
| `template/` | The n8n Creator Portal version (below). |

## Day-to-day edits

Everything you'd change lives in the **Build Config** node (`src/build-config.js`): role groups, location lists, company boards, caps and max age. Add a role or a company by editing an array. The filter logic never needs touching.

If you edit in the n8n UI, the instance copy and these files will drift apart. Either keep editing in the UI, or edit `src/` and rebuild.

## n8n template version

`template/` holds the shareable version submitted to the n8n Creator Portal: *Collect job postings from Greenhouse, Ashby and Lever to Google Sheets*.

- Config moves into a **Configure Job Search** Set node, so users edit fields instead of code.
- No credentials, spreadsheet ID, timezone or instance metadata.
- Sticky notes explain each stage, with setup steps and the sheet headers.

Rebuild it from `src/` with `node template/build-template.mjs`; test it with `node template/test-template.mjs <samples-dir>`. The listing description is in `template/description.md`.

Please keep the job links from Remotive, RemoteOK and Jobicy intact. Their terms ask for attribution.
