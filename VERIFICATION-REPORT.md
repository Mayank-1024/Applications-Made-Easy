# Verification report

All checks below are real API calls made on 2026-10-11, not estimates.

## Company boards

### Seed list from the starting JSON

| ATS | Token | Result | Jobs |
|---|---|---|---|
| Greenhouse | anthropic | ✅ 200 | 645 |
| Greenhouse | databricks | ✅ 200 | 886 |
| Greenhouse | figma | ✅ 200 | 150 |
| Greenhouse | discord | ✅ 200 | 49 |
| Greenhouse | klaviyo | ✅ 200 | 145 |
| Greenhouse | robinhood | ✅ 200 | 182 |
| Greenhouse | benchling | ❌ **404**: moved to Ashby (below) | 0 |
| Greenhouse | wayfair | ❌ **404**: dropped | 0 |
| Ashby | ramp | ✅ 200 | 165 |
| Ashby | linear | ✅ 200 | 31 |
| Ashby | vanta | ✅ 200 | 83 |
| Ashby | openai | ✅ 200 | 815 |
| Ashby | deel | ❌ 200 but **0 jobs** (Ashby returns an empty board for unknown names): dropped | 0 |
| Ashby | benchling | ✅ 200 (replaces the dead Greenhouse token) | 58 |

### Your target list

I probed each company against Greenhouse, Ashby, Lever, SmartRecruiters, Workable, Recruitee and Personio.

| Company | Public board found | Jobs | In workflow |
|---|---|---|---|
| Anthropic | Greenhouse `anthropic` | 645 | ✅ |
| OpenAI | Ashby `openai` | 815 | ✅ |
| n8n | Ashby `n8n` | 38 | ✅ |
| Palantir | **Lever** `palantir` | 309 | ✅ (you approved adding Lever) |
| Bitovi | JazzHR (applytojob.com), no public keyless API | – | ❌ |
| STX Next, Bacancy Technology, Exxeta, Flowlyn, Goodspeed, DataFix | No public ATS board found; careers pages were 404, blocked by Cloudflare, or had no ATS embed | – | ❌ |
| Amazon/AWS, Microsoft, Apple, Tesla, FedEx, KPMG, Avalara | Proprietary career sites or Workday; no sanctioned keyless API | – | ❌ (no scraping) |

Notes:
- **DataFix:** `datafix.com` is an elections-software company. If you meant a different DataFix, send me its careers URL.
- **Personio `amazon`:** it returned 3 jobs, but that subdomain belongs to some other company, not Amazon, so I ignored it.

## Aggregate boards (one test call each)

| Source | Jobs returned | Notes |
|---|---|---|
| Remotive `?limit=100` | **18** | The whole free feed is 18 jobs, delayed 24h; it asks for ≤4 calls/day. |
| RemoteOK | **99** (+1 legal notice) | 41 of 99 have a blank location. |
| Jobicy `?count=50` (brief) | 50 | Only about 6 were US. |
| Jobicy `?count=100&geo=usa` (you approved) | **100** | |

## Changes from the starting JSON, and why

**Correctness bugs**

1. **Dedupe key.** The brief said to strip the whole query string. Databricks serves all 886 jobs from one path and tells them apart only by `?gh_jid=`, so stripping the query would turn 886 jobs into 1 key, and after the first Databricks row nothing else from Databricks would ever be written. The key now keeps identity params (`URL_ID_PARAMS` in config, e.g. `gh_jid`) and drops everything else. I tested it: rows saved with `utm_source` and `gh_src` appended were still recognized as duplicates.
2. **Substring matching → whole-word matching.**
   - Exclude `intern` matched "internal" and "international".
   - Block `india` matched "Indiana".
   - Allow `'us '` (with a trailing space) matched "campus ", and missed "US" at the end of a string.
3. **Excludes were checked against the description**, so "reports to the Director" dropped the job. Excludes now check the same field as includes.
4. **A failed Applications read was ignored** (continue on error). The run then went ahead with an empty dedupe set and re-appended up to 100 duplicates. Now a failed read stops the run.
5. **The Run Log depended on canvas position.** The old version ran the log branch in parallel and only worked if it sat lower on the canvas. The filter now emits one `{rows, stats}` item and an If node sends zero-row runs straight to the log. Tested: the zero-row run writes `rows appended: 0`.
6. **"rows appended" now reflects reality.** It used to count what the filter produced. Now it counts what Google Sheets returned. A failed append is reported in `dead sources` and no longer suppresses the log.
7. **Responses were matched to companies by array position.** A failed request could shift every later company onto the wrong jobs. They're now matched by paired item.
8. **Cell format `USER_ENTERED` → `RAW`.** A description starting with `=` would have run as a formula.
9. **Extra fields.** `handlingExtraData` changed from its default of "insert new column" to `error`, so a header mismatch fails loudly.

**Outdated versions and missing settings**

10. **Node versions pinned to what your instance supports** (Schedule Trigger **1.2**, HTTP Request **4.2**, Google Sheets **4.5**, If **2.2**). The first deploy used the newest versions in n8n-mcp's database (1.4 / 4.5 / 4.7 / 2.3), and those are newer than your n8n. The trigger showed as an unknown "?" node and the HTTP nodes had broken icons. I took the versions from your instance's own workflows (Madison runs HTTP 4.2; others run Schedule 1.2, Sheets 4.5 and If 2.2).
11. **Workflow timezone** set explicitly to `America/New_York`, so "09:00" means your 09:00.
12. **Missed-run policy: dropped.** It only exists in Schedule Trigger 1.4. On 1.2, a run missed while the VPS is down is skipped until the next 3-day slot.
13. **`alwaysOutputData` on HTTP and Targets nodes**, so an all-empty or disabled board family still reaches the Merge.

**Behaviour changes you approved**

14. Location model widened to **any US location**. It adds US state names, `, XX` state codes and metro names. It also splits multi-city strings, so "San Francisco, CA; London, UK" passes on SF. An explicit "USA" overrides the block list, so "USA, UK, India" still passes.
15. **Age filter applies to aggregate boards only.** Company-board listings are live roles.
16. **Per-company cap of 15.**
17. **Lever added** as a third company-board source, for Palantir.
18. **Jobicy query** changed to `count=100&geo=usa`.
19. **Seed list kept, alongside your companies.**

**Structural changes**

20. Map nodes are pure field mapping. HTML/entity cleaning and date parsing live in one **Normalize Jobs** node instead of being copied five times.
21. `USE_COMPANY_BOARDS` flag removed. An empty board list disables that family.
22. Code nodes live as files in `src/`, with `build.mjs` assembling the workflow and `test-local.mjs` running the real node code against saved responses.

## Deployment

- **Created:** workflow ID `yp76uWX0vw6CRWgJ`, **inactive**, in your personal project root.
- **No isolation:** I couldn't put it in a separate project or folder. The folders API doesn't exist on this instance (needs n8n 2.19 or later), and projects are an Enterprise feature.
- **Nothing else touched:** no existing workflow or credential was read for editing or changed.
- **Check after deploy:** I read the workflow back and confirmed the code bodies match `src/`.

## Validation

- n8n-mcp `n8n_validate_workflow` on the **live** workflow (runtime profile): **valid, 0 errors, 0 warnings**, 32 valid connections, 10 expressions validated.
- Before deploying, the same validator gave the same result on the local JSON with code bodies stubbed.
- Local harness, run against today's real responses:
  - collected **3,773**
  - matched **818**
  - would append **100** (Anthropic 15, Databricks 15, OpenAI 15, Robinhood 12, Discord 10, Klaviyo 7, Ramp 6, Vanta 6, n8n 4, Benchling 4, Palantir 3, Figma 3)
  - deferred: 624 over the per-company cap, 94 over the run cap
  - dropped: `no_role_match` 2,571, `location_blocked` 320, `too_old` 60, `bad_date` 4
  - These are a **projection**. The real first-run numbers come from the n8n execution.
- Edge cases tested locally:
  - 645 pre-existing rows with tracking params: 93 matched jobs recognized as already in the sheet, and `s.no` continued at 686
  - two dead boards: named in `dead company boards`
  - every company board dead: run still logged
  - zero new jobs: If takes the false branch and the Run Log is still written
