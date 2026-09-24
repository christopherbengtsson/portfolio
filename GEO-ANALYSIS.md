# SEO and GEO review

Reviewed 24 September 2026. Scope: current source and fresh static build, plus the production English and Swedish homepages at https://christopherbengtsson.dev/ and https://christopherbengtsson.dev/sv/.

The technical foundation is sound. The main growth opportunities are clearer consulting intent, stronger identity signals, and first-hand project evidence. No site-wide indexing block was established. Actual rankings, indexing coverage, traffic, Core Web Vitals and AI citation frequency were not measured.

No previous `.seo-cache` data was present; this review uses fresh evidence.

## Priority findings

### 1. Strengthen identity and corroboration — high content priority

`src/layouts/SiteLayout.astro:19` provides a stable Person ID, name, role and university, but no `sameAs` profiles. Neither the current homepage template nor the fetched production pages links to a professional profile, code portfolio or verifiable work artifact. The live site's only external HTML link is to IMY in the privacy section.

This makes it harder to connect the person to independent evidence and distinguish him from people with the same name. Limited public searches returned several namesakes and an apparently relevant Intch profile, but did not establish ownership of any particular LinkedIn or GitHub profile. Do not infer profile URLs from the name or copy links belonging to namesakes.

Add verified professional profiles as visible links and as `Person.sameAs`. Add public repositories, talks or other work evidence where relevant. Keep the existing distinction between employment/client work and independent services. Do not describe former employers as current employers or endorsers.

### 2. Make the commercial offer explicit — high content priority

Both titles identify a developer but omit the consulting offer. The descriptions list activities without the Sweden/remote context or part-time availability that already appears elsewhere. The headings “Build and extend” and “Review and advise” are understandable but broad.

Evidence: `src/content/web/en/home.json:3`, `:36`; `src/content/web/sv/home.json:3`, `:24`. The production copy has the same broad positioning, with some older wording.

Suggested title options, subject to the desired positioning:

- English: `Full-stack developer & consultant | Christopher Bengtsson`
- Swedish: `Fullstack-utvecklare och konsult | Christopher Bengtsson`

Suggested English description: “Sweden-based full-stack developer available for part-time remote projects: React and TypeScript development, integrations, maintenance and automation.”

Suggested Swedish description: “Fullstack-utvecklare och konsult i Sverige för uppdrag på deltid och distans. Hjälp med React, TypeScript, integrationer, underhåll och automatisering.”

Use specific capability headings where natural, such as “System integrations and internal tools” or “Code and architecture reviews.” These are editorial suggestions, not keywords validated by search-volume or SERP research. Meta descriptions support result presentation; they do not guarantee ranking gains.

### 3. Turn selected work into evidence people can cite — high content priority

The four project summaries are the site's strongest material: named contexts, dates, technologies and personal responsibilities. However, they largely describe work performed rather than the problem, constraints, decisions and observable result. There are no linked case studies, demonstrations or supporting artifacts.

Evidence: `src/content/web/en/home.json:64`; `src/content/web/sv/home.json:52`; rendering at `src/container/astro/LandingPage.astro:51`.

Start with one substantive case study based on the KYC/Salesforce integration or change-request portal. Explain the starting problem, Christopher's exact contribution, a technical decision, the resulting workflow and a lesson. Add a date and a public diagram or code example if useful and permissible. Use numerical outcomes only when records support them; a specific qualitative result is better than invented metrics.

A separate case-study URL gives the subject its own title, introduction and internal links. Keep the concise homepage summary. The site's two indexable language pages are sufficient for an initial portfolio; create additional service pages only when they answer distinct buyer questions with substantive content.

### 4. Verify access at Cloudflare, beyond robots.txt — medium, conditional technical risk

The live robots file allows Googlebot, Bingbot, OAI-SearchBot, PerplexityBot and the wildcard group. Curl fetched the homepages, robots file, sitemap and llms.txt successfully. Python urllib with its default client signature received HTTP 403 and `error code: 1010`, including on robots.txt. The web retrieval tool fetched the English homepage but failed on several supporting URLs.

This establishes client-dependent access, **not** that Googlebot or a verified AI crawler is blocked. Cloudflare documents 1010 as a browser-signature block; the exact account rule was not inspected. Check Security Events and requests from verified crawlers, plus Search Console's live URL test. Change a rule only if legitimate access is affected; do not disable all protection or allow arbitrary clients solely by their user-agent string. [Cloudflare error 1010 documentation](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/).

### 5. Consolidate the www hostname — medium technical improvement

`https://www.christopherbengtsson.dev/` returns 200 with the same content as the apex instead of redirecting. Its canonical already points to the apex, which mitigates duplication. HTTP redirects to HTTPS, but the www variant remains www.

Add a permanent 301/308 redirect from www to the corresponding apex URL, preserving path and query string. Keep the existing canonical tags. This is a consistency improvement, not evidence of a duplicate-content penalty. [Google canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

### 6. Align the education claim with visible content — low priority

Person JSON-LD declares `alumniOf: Örebro University` on every page, but neither homepage's visible text mentions that education. If the claim remains, include a short visible education line in the biography; otherwise remove the property until the content supports it. This is a structured-data/content consistency issue, not an established ranking penalty. Evidence: `src/layouts/SiteLayout.astro:23`. [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

## Deployment difference

Production is serving an older version than this checkout. Its English title says “Fullstack software engineer,” whereas the current build says “Full-stack software engineer.” Live privacy information is an inline section linked through `#privacy`; `/privacy/` and `/sv/privacy/` return real 404 responses. The current build includes both standalone privacy pages with `noindex, follow` and links to them.

This is not presently broken privacy navigation: the production links target its inline section. When deploying the current version, verify the new routes and their links together. Do not assume a local build proves the current production state. No deployment was performed during this review.

## Checks that passed

| Check | Evidence |
|---|---|
| Main landing pages | Both live language URLs return HTTP 200 through curl. |
| Static content | Headings, service copy and experience are in initial HTML; key content does not require JavaScript. |
| Language handling | Correct HTML languages, reciprocal en/sv alternates and separate self-canonicals. Swedish does not canonicalize to English. |
| Page structure | One H1 and logical H2/H3 structure on each homepage. |
| Sitemap | HTTP 200; both canonical homepages; reciprocal language annotations. |
| Robots | HTTP 200 through curl; permissive rules; correct sitemap URL. |
| Structured data | Parseable Person and WebSite JSON-LD, stable IDs and publisher reference. |
| Social previews | Both localized PNGs return HTTP 200; dimensions and descriptions are declared in source. |
| Unknown routes | A deliberately nonexistent route returns HTTP 404, avoiding a homepage fallback. |
| Local output | `pnpm build` and `python3 scripts/verify-output.py` pass. |

## Missing icon and sharing basics — confirmed follow-up

The initial summary understated this gap. `src/layouts/SiteLayout.astro` explicitly uses `<link rel="icon" href="data:," />`, and `public/` contains no favicon asset. This should be an early, inexpensive fix for browser and search-result presentation. Google can display a site's favicon beside its search result; the empty placeholder supplies no usable branded icon. Add a recognizable square PNG (for example 96 × 96) at a stable crawlable URL, link it from the layout, and optionally provide an ICO for browser compatibility. Appearance in Google remains discretionary. [Google favicon requirements](https://developers.google.com/search/docs/appearance/favicon-in-search).

Additional source checks:

| Item | Status | Action |
|---|---|---|
| Favicon | Empty data URL; no asset | Replace with a real branded icon. |
| Apple touch icon | No asset or link | Add an icon for saved home-screen presentation. |
| X/Twitter card metadata | No `twitter:*` tags | Add explicit card metadata if sharing on X matters; the actual preview was not tested. |
| Open Graph images | Localized images and metadata present | Retain; these do not replace a favicon. |
| Web app manifest | Absent | Optional for this consultancy site; not a core SEO defect. |
| Theme color | Absent | Optional browser presentation enhancement. |

The existing output validator checks Open Graph metadata and assets but has no favicon assertion, so its passing result did not establish complete icon/share readiness. When implementing icons, verify that the linked files exist and are decodable images rather than merely checking for a `rel="icon"` tag. An `x-default` language annotation is optional; its absence is not a defect here.

## GEO readiness

**Editorial readiness estimate: 67/100.** This is a subjective prioritization rubric, not a measured platform score, ranking prediction or comparison with competitors: citability 15/25, structural readability 18/20, useful visual evidence 3/15, identity/authority evidence 13/20, technical accessibility 18/20. Unverified edge access and missing corroboration limit confidence. Adding media only to improve this score would be counterproductive; use it when it explains actual work.

| Platform | Observed readiness | What remains unverified |
|---|---|---|
| Google AI Overviews / AI Mode | Static, crawlable-by-curl content and conventional SEO signals are present. | Google indexing, selected canonical and inclusion in AI answers. |
| ChatGPT search | OAI-SearchBot is allowed in robots.txt; useful content is in HTML. | Requests from real crawler IPs and actual citations. |
| Perplexity | PerplexityBot is allowed in robots.txt; useful content is in HTML. | Verified bot access and actual citations. |

Numerical platform visibility scores are not available from these checks. Robots rules express permission; they do not demonstrate crawling or inclusion.

GPTBot, ClaudeBot, CCBot and other unlisted agents are also allowed by the wildcard rule. GPTBot concerns model-training crawling; allowing it is not required to permit OAI-SearchBot search crawling. User-triggered ChatGPT-User access is a separate mechanism. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

`/llms.txt` exists and returns 200 through curl. Its bilingual links and scope disclaimer are useful as an optional guide. No new AI-specific file or schema is needed for Google's AI features; Google explicitly says conventional SEO practices apply. Prioritize content and access over expanding llms.txt or adding licensing files solely for visibility. [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features).

## Passage and schema recommendations

The existing KYC and change-request summaries are the best starting points because they explain a concrete contribution. They would be stronger when each passage states the subject independently and includes a supported result. There is no established universal word count that guarantees citation; do not pad passages to a fixed length.

Example introduction using existing site facts:

> Christopher Bengtsson is a Sweden-based full-stack developer with more than nine years of experience. He is available for part-time remote projects involving software development, system integrations, maintenance and workflow automation. His experience includes React and TypeScript interfaces, backend services and data integrations from employment and consulting assignments.

Add concise answers to actual buyer questions such as “Can you work with our existing team?”, “Can you maintain an existing application?” and “What information do you need to assess a project?” Put an answer directly after each heading. Do not add unsupported promises about response times, prices or availability.

Retain Person and WebSite. Verified `sameAs` links and visible education are the next useful schema changes. Optional WebPage `mainEntity` references may clarify the relationship to the Person; Service markup can describe substantial service content if added later. Neither is special AI ranking markup. Do not add review ratings, employer endorsements or FAQ rich-result claims without an applicable basis.

## External visibility and measurement limits

Limited branded searches returned an older cached version of the homepage and multiple namesakes. One apparently relevant Intch result described 13 years of experience, compared with the site's 9+ years; ownership and the underlying dates were not verified, so this is a profile-consistency check rather than a confirmed factual error. No verified Reddit, YouTube, Wikipedia or LinkedIn presence was established in this review. That does not demonstrate those profiles or mentions are absent.

Next measurement steps: inspect both homepages and submit the sitemap in Google Search Console and Bing Webmaster Tools; inspect Cloudflare crawler events; collect mobile LCP, INP and CLS field data when available. Track inquiries from organic and AI referrals rather than treating raw mentions as business outcomes. A small, repeatable set of relevant discovery queries can establish an AI visibility baseline, with dates, platforms and cited URLs recorded.

The review did not access Search Console, Bing Webmaster Tools, analytics, Cloudflare logs or a backlink index, and did not run a mobile performance audit. No claims about traffic, rankings, Core Web Vitals, complete brand coverage or current AI recommendation rates follow from this report.

## Recommended order

1. Verify real crawler access and reconcile the production version with the intended release.
   Include the missing favicon and touch icon among the first release-polish fixes.
2. Add verified identity links and clarify the consulting offer in both languages.
3. Publish one evidence-rich case study and link it from the homepage.
4. Redirect www to the apex and align visible education with schema.
5. Establish indexing, query and inquiry baselines before expanding the content footprint.
