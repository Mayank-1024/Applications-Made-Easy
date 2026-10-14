# Paid / third-party job-posting data APIs for n8n

Options for getting LinkedIn, Indeed, Glassdoor and Google Jobs postings into an n8n workflow (HTTP Request node, or the Apify community/official node), instead of free keyless job boards.

Prices are in USD unless marked, exclude tax, and were read from vendor pages on 2026-10-11. They change often, so recheck before you budget.

## Comparison

| Provider | Sources covered | Entry price (cheapest paid) | Free tier | Notes |
|---|---|---|---|---|
| **Apify** (platform + Store actors) | Each actor covers one site. Popular ones: LinkedIn Jobs Scraper (curious_coder), LinkedIn Jobs Scraper (bebity), Indeed Scraper (misceres), Glassdoor Jobs Scraper (bebity). Multi-site actors also exist. | Platform Starter **$19/mo**, which includes $19 of usage [1]. Actors are pay-per-event: LinkedIn (curious_coder) **from $1.00 / 1,000 results** [2]; LinkedIn (bebity) **from $1.00 / 1,000** [3]; Indeed (misceres) **from $3.00 / 1,000 listings** [4]; Glassdoor (bebity) **$0.40 / 1,000 on Free tier, $0.28 on Gold+** plus a $0.00005 start fee per run [5]. | **Yes.** $0 plan with **$5/mo of usage**, no credit card. Unused credit does not roll over, and runs are blocked once the $5 is used [1]. | Scraping-based, built by third-party actor developers. "From" prices are the lowest-tier rates, so Free-plan users pay more per result; per-tier rates for curious_coder and misceres are not shown publicly (unconfirmed). LinkedIn's User Agreement §8.2 bans scraping [16], so ToS risk sits with you. Quality depends on each actor (e.g. the bebity Glassdoor actor shows an 82.6% run success rate [5]). |
| **Bright Data** | Web Scraper API includes LinkedIn Jobs [7], Indeed job listings [8] and Glassdoor job listings [9] scrapers. Pre-collected **Datasets** cover LinkedIn, Indeed and Glassdoor job listings (126.9M+ records) [10]. | Scraper API pay-as-you-go **$1.50 / 1,000 records**, billed only on success. Scale plan **$499/mo** includes 384K records, then $1.30/1K [6][7]. Datasets: **$250 minimum order**, "up to $0.0025/record", which is about $2.50/1K [10]. | **Yes.** Scraper API gives **5,000 records/mo free**, no credit card, no rollover [6][7]. Datasets offer only sample/demo data on request (not a free tier) [10]. | Scraping-based: Bright Data collects public data. It is the most "pay per record, no subscription" option. A Glassdoor-specific price is not stated; it is assumed to be the general $1.50/1K rate [9]. The page shows a promo code (APIS25, 25% off for 3 months) [6]. |
| **TheirStack** | Aggregates more than **362k sites**. Top sources by volume: **Indeed (~40%)** and **LinkedIn (~19%)**, then Workday, Naukri, iCIMS, Seek, etc. Some are scraped directly and some come through aggregators [12]. Glassdoor and Google Jobs are **not named** (unconfirmed). | **$49/mo for 1,500 API credits** (about $32.67/1K). 1 job = 1 API credit [11][13]. Tiers go up to $1,500/mo for 1M credits [11]. | **Yes.** Free plan gives **200 API credits/mo + 50 company credits/mo**, max 5 pages × 25 results, rate limit 400/day. Only for accounts that have never paid [14]. Credit-card requirement not stated (unconfirmed). | De-duplicated, normalized aggregator with a Job Search endpoint and webhooks (`job.new`, `job.closed` cost 1 credit per job [13]). Credits roll over for 12 months, cancel anytime [11]. Per job it is the priciest at the low tiers, but it is a single API across sources. |
| **Coresignal** | **Multi-source Jobs**: the docs name "Professional network" (i.e. LinkedIn-derived), Indeed and Glassdoor, "etc." [18]. **Base Jobs API**: a single-source dataset scraped since Aug 2020; its source is not named in the docs [17]. | **Mini $49/mo for 2,500 credits** [15]. Job collect = **1 credit per job**; search endpoints are free, preview costs 10 credits [15][17][19]. | **Yes, a trial.** **2,000 credits valid for 7 days**, only for the first registrant per company email domain [20]. Credit-card requirement not stated (unconfirmed). | Data is scraped/aggregated by the vendor and sold as an API. The pricing page does not explicitly say jobs are included on Mini; it lists "Multi-source endpoints" and "Multi-source job posting: 1 credit" [15] (treat as likely, unconfirmed). Third-party pages cite older 14-day / 200-credit trial terms that conflict with the current docs, so go by the docs [20]. |
| **SerpApi – Google Jobs API** | Google Jobs results. Google for Jobs aggregates listings from providers "including LinkedIn, Monster, WayUp, DirectEmployers, CareerBuilder, Glassdoor and Facebook" [23]. Each result has a `via` field naming the source (sample shows Indeed) [22]. | **Starter $25/mo for 1,000 searches**. Then Developer $75 / 5K and Production $150 / 15K [21]. Up to **10 results per page/search** [22], so 1,000 searches is at most about 10,000 listings. | **Yes.** **250 searches/mo** free [21]. | Scrapes Google SERPs; SerpApi handles proxies and CAPTCHAs. It returns Google's copy of the listing plus `apply_options` links, not the full LinkedIn record. Billing is per search (page), not per job. |
| *Extra:* **JSearch** (OpenWeb Ninja, also on RapidAPI) | Google for Jobs data covering "LinkedIn, Indeed, Glassdoor, ZipRecruiter" [24]. | On OpenWeb Ninja's own portal: pay-as-you-go **$0.03 per 10 requests** (~$3 per 1,000 requests), minimum purchase $0.50 [25]. **RapidAPI tier prices: unconfirmed** (page not readable). | **Yes.** 50 free requests on OpenWeb Ninja (verified email) [25]. A free Basic plan on RapidAPI is widely reported, but the quota is unconfirmed. | Built on scraping Google for Jobs (similar to SerpApi but job-specific). The portal pricing came from a machine-readable manifest, so it is somewhat uncertain; check in the dashboard. |
| *Extra:* **Fantastic.jobs** (Active Jobs DB) | "200k+ career sites across 58 ATS platforms" (Workday, Greenhouse, Lever...) "plus 10M+ LinkedIn, Wellfound, and Y Combinator jobs every month" [26]. | **$95/mo for 20,000 jobs + 10,000 API requests** [26]. | **Yes.** 7-day free trial, no credit card, 500 jobs/week + 50 requests/week [26]. | Strongest on employer ATS/career-site postings (often the original source); LinkedIn is included in every plan. Hourly refresh, expiry checks. Also sold as Apify actors [26]. Not a Glassdoor/Indeed source. |
| *Extra:* **Mantiks** | Job-posting data for sales prospecting. Sources not listed on the pricing page (unconfirmed) [27]. | **€99/mo (annual billing) for 500 credits**, Starter [27]. | A free trial is mentioned; length and limits not stated (unconfirmed) [27]. | Seat-based sales-intelligence tool rather than a raw jobs feed. A poor fit for bulk n8n job ingestion; listed only for completeness. |

### Quick cost comparison (approximate, per 1,000 job records at entry tier)

- Apify actors: about $0.28–$3 per 1K, on top of a $0–$19/mo platform plan
- Bright Data Scraper API: $1.50 per 1K (5K free/mo)
- Bright Data Datasets: about $2.50 per 1K ($250 minimum)
- Fantastic.jobs: about $4.75 per 1K ($95 / 20K)
- Coresignal Mini: about $19.60 per 1K ($49 / 2,500, if all credits go to job collects)
- TheirStack: about $32.67 per 1K ($49 / 1,500)
- SerpApi: $25 per 1K searches, which is at most about 10K listings, so about $2.50+ per 1K listings
- JSearch (OWN portal): about $3 per 1K requests (records per request vary)

These are my own arithmetic from the cited prices, not vendor-stated figures.

## LinkedIn's own Jobs API is partner-only, not self-serve

LinkedIn does not sell job-posting data through a self-serve API. Its Job Posting API sits inside **LinkedIn Talent Solutions** and is built for ATSs and job distributors to **post** jobs to LinkedIn for customers, not to pull LinkedIn's job inventory. Microsoft Learn's Job Posting API overview says:

> "We are currently not accepting new partnerships for LinkedIn's Job Posting API. If you would like to gain access to LinkedIn's Job Posting APIs please request access to Apply Connect."

> "The use of these APIs is restricted to those developers approved by LinkedIn. Please reach out to your LinkedIn Relationship Manager or Business Development contact as you will need to meet certain criteria and sign an API agreement with data restrictions in order to use this integration."
> "If you are not yet a LinkedIn Talent Solutions Partner, please complete the LinkedIn Talent Solutions Partner Request Form."

Source: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview [28] (doc updated 2026-06-03). Talent Solutions hub: https://learn.microsoft.com/en-us/linkedin/talent/ [29].

Every option in the table above is therefore a third-party route to LinkedIn-derived data, through scraping, scraped/aggregated datasets, or Google for Jobs. LinkedIn's User Agreement §8.2 forbids using "software, devices, scripts, robots or any other means or processes" to "scrape or copy the Services" [16]. Whether a vendor's collection is legal is their problem, but your use is still bound by LinkedIn's ToS if you scrape it yourself or log in.

## Flags and uncertainties

- Apify "from" prices are the best-tier rates. The Free-plan rate for curious_coder and misceres is not shown on the public page. A third-party page cites $2/1K on Free for curious_coder (not verified).
- TheirStack: no confirmed Glassdoor or Google Jobs coverage. Credit-card requirement for the free plan not stated.
- Coresignal: the pricing page does not say explicitly that jobs endpoints are on the Mini plan. The table layout makes the "Free tier 2,000 credits" vs "7-day trial" wording ambiguous; the docs say 2,000 credits for 7 days.
- JSearch: RapidAPI plan prices not confirmed. OpenWeb Ninja portal price taken from its live pricing manifest.
- Mantiks: sources, credit definition and trial terms are not on the pricing page.

## Sources

1. Apify pricing – https://apify.com/pricing
2. Apify LinkedIn Jobs Scraper (curious_coder) – https://apify.com/curious_coder/linkedin-jobs-scraper (pricing tab: https://apify.com/curious_coder/linkedin-jobs-scraper/pricing)
3. Apify LinkedIn Jobs Scraper (bebity) – https://apify.com/bebity/linkedin-jobs-scraper
4. Apify Indeed Scraper (misceres) – https://apify.com/misceres/indeed-scraper (pricing tab: https://apify.com/misceres/indeed-scraper/pricing)
5. Apify Glassdoor Jobs Scraper (bebity) – https://apify.com/bebity/glassdoor-jobs-scraper
6. Bright Data Web Scraper API pricing – https://brightdata.com/pricing/web-scraper
7. Bright Data LinkedIn Jobs Scraper – https://brightdata.com/products/web-scraper/linkedin/jobs
8. Bright Data Indeed Scraper – https://brightdata.com/products/web-scraper/indeed
9. Bright Data Glassdoor Scraper – https://brightdata.com/products/web-scraper/glassdoor
10. Bright Data Jobs Datasets – https://brightdata.com/products/datasets/jobs
11. TheirStack pricing – https://theirstack.com/en/pricing
12. TheirStack job data sources – https://theirstack.com/en/docs/data/job/sources
13. TheirStack credits docs – https://theirstack.com/en/docs/pricing/credits
14. TheirStack plans docs – https://theirstack.com/en/docs/pricing/plans
15. Coresignal pricing – https://coresignal.com/pricing/
16. LinkedIn User Agreement (§8.2) – https://www.linkedin.com/legal/user-agreement
17. Coresignal Base Jobs API docs – https://docs.coresignal.com/jobs-api/base-jobs-api
18. Coresignal Multi-source Jobs data dictionary – https://docs.coresignal.com/jobs-data/multi-source-jobs-data/dictionary-multi-source-jobs-data
19. Coresignal Multi-source Jobs API docs – https://docs.coresignal.com/jobs-api/multi-source-jobs-api
20. Coresignal free trial docs – https://docs.coresignal.com/self-service/account-management/free-trial
21. SerpApi pricing – https://serpapi.com/pricing
22. SerpApi Google Jobs API docs – https://serpapi.com/google-jobs-api
23. Google blog, job search launch (partners list) – https://blog.google/products/search/connecting-more-americans-jobs/
24. OpenWeb Ninja JSearch – https://www.openwebninja.com/api/jsearch
25. OpenWeb Ninja live pricing manifest – https://agents.openwebninja.com/manifest.json
26. Fantastic.jobs API & pricing – https://fantastic.jobs/api
27. Mantiks pricing – https://mantiks.io/pricing
28. LinkedIn Job Posting API overview (Microsoft Learn) – https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview
29. LinkedIn Talent Solutions overview (Microsoft Learn) – https://learn.microsoft.com/en-us/linkedin/talent/

---

Researched 2026-10-11
