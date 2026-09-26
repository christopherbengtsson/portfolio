# Traffic acquisition research

Research date: 26 September 2026. Implementation decision: keep previous work on the homepage; use dedicated routes for the three services. Separate work routes were removed before deployment. Website: [christopherbengtsson.dev](https://christopherbengtsson.dev/).

**Recommendation: keep the broad senior software engineer identity and attract smaller, well-scoped projects through focused service pages. Start with application fixes and improvements, API integrations, and technical reviews, supported by the existing selected-work descriptions.** The objective is qualified inquiries that fit around an existing full-time assignment.

Christopher clarified that he wants a broad range of software engineering work and is currently 100% allocated to another assignment. Smaller assignments are the immediate priority. These pages are entry points for different buyer problems, not a restriction to one specialty. Exact spare capacity, pricing and minimum engagement remain unspecified. Priorities below are editorial judgments based on relevance, observed buyer requests and existing experience; they are not search-volume or keyword-difficulty scores.

## Evidence and limitations

Reviewed the repository, prior SEO cache dated 24 September, the live English homepage through a fresh HTTP fetch, public Upwork requests, Contra and Brainville marketplace pages, competitor websites, web searches in English and Swedish, and two Google result pages in the browser. The existing cache remains historical; current findings below supersede outdated identity and production-copy findings.

The browser Google checks used an existing signed-in session with Swedish, personalized results. They show page types and example citations, not neutral national rankings. Public search-tool results may be cached: relative Upwork posting dates sometimes conflict with crawl dates, so listings demonstrate buyer language and requirements, not guaranteed live opportunities. This is a purposive sample, not an estimate of market size.

No Search Console, private analytics, backlink index, paid keyword database, or Cloudflare crawler logs were accessed. No standalone ChatGPT/Perplexity conversations were run. AI Overviews were observed directly; the conversation prompts below are proposed research tests, not observed conversations or measured prompt demand.

The live English page now contains the consulting title, part-time positioning, LinkedIn/GitHub links and matching Person.sameAs. The earlier report's claim that these are absent is outdated. There are still only two indexable landing pages in the source sitemap. The story Markdown is a draft and has no registered collection or published route.

## What buyers are buying

| Opportunity | Evidence from public buyer requests | Fit and implication |
|---|---|---|
| Integration and workflow improvement | A [CRM workflow request](https://www.upwork.com/freelance-jobs/apply/CRM-Workflow-Automation-Specialist-HubSpot-n8n-Make-API-Integrations_~022100127476303446941/) asks for process review, reliable data, API/webhook connections and understandable technical decisions. | Strong match to the Salesforce/KYC and SOAP portal work. Sell dependable business workflows. The listing also requires HubSpot/n8n expertise and over 30 hours/week, so it is demand evidence, not an automatic job match. |
| Existing application maintenance | An [ongoing SaaS maintenance request](https://www.upwork.com/freelance-jobs/apply/Full-Stack-Developer-Ongoing-Maintenance-for-Social-Media-SaaS-Web-Platform_~022093099000464733312/) asks for refactoring, fixes, updates and part-time availability. Its displayed $150 budget is inconsistent with a substantial ongoing scope. | Strong experience match, but a secondary acquisition target while fully allocated elsewhere. Screen budget and response expectations. Do not use marketplace budgets as your price benchmark or promise emergency support. |
| Paid assessment followed by implementation | A [senior React/TypeScript request](https://www.upwork.com/freelance-jobs/apply/Senior-Full-Stack-Developer-React-TypeScript-Supabase-Shopify_~022098081600903493950/) specifies an initial paid technical audit of roughly 10–20 hours. | A bounded review can be an entry offer before larger work. Platform-specific requirements still need checking. |
| Finish and stabilize AI-built apps | An [audit-and-finish request](https://www.upwork.com/freelance-jobs/apply/Senior-Full-Stack-Mobile-Engineer-Audit-Finish-existing-App-React-TypeScript-Supabase_~022101021759393698782/) seeks an engineer who can understand an existing app and explain risks to a nontechnical founder. | Relevant adjacent offer. It also requires Supabase and mobile deployment experience not established by this website. Build a demonstrable web-app example before advertising specialized Lovable/Supabase expertise. |

The recurring problem is ownership after the initial build: understand what exists, diagnose failures, improve it and explain the work. Your named experience supplies a credible foundation for that positioning.

## Search findings

| Query actually researched | Observation | Decision |
|---|---|---|
| `API integration konsult Sverige` — Google browser | Service providers and brokers appeared, including Balr, Redpill Linpro and ACG Devs. An AI Overview visibly cited Balr and Opsio. | Give integration consulting its own page, with a concrete example and clear engagement scope. Broad enterprise integration terms still face established competitors. |
| `React konsult deltid` — Google browser | Job boards were prominent among web results. The AI Overview cited Kumpan, Right People Group, APW and Kvadrat. | Prefer “available for smaller, clearly scoped projects” in public copy, and write for buyers using “anlita”, existing applications and specific deliverables. Do not rely on “deltid” alone to filter intent. |
| `systemintegration API konsult automatisering företag` — web search | Dedicated service pages, including HejNord and smaller consultancies, describe manual data transfer and operational workflows. | Lead with the business problem and use API terminology to explain how it is solved. |
| `hire part time React TypeScript developer maintenance existing app` — web search | Staffing/service pages and public hiring discussions both appeared. | A service page can address a specific fix or improvement. Broad takeover and ongoing-delivery offers are less suitable for current capacity. |
| `hire developer fix AI built app Lovable Bolt production` — web search | Numerous dedicated rescue and prototype-to-production services appeared. | Commercial intent exists, but this is already a competitive category. Test a focused offer with proof, not dozens of builder-name pages. |

These are observations, not evidence of high search volume. Candidate variations below have not all been tested individually.

## Pages to prioritize

| Priority | Proposed English route / Swedish counterpart | Candidate buyer searches | What would earn the inquiry |
|---|---|---|---|
| 1 | `/services/api-integrations/` / `/sv/tjanster/api-integrationer/` | API integration consultant; CRM integration developer; anlita integrationskonsult; automatisera data mellan system | Specific workflows, validation, failure handling, ownership and a link to the homepage’s Salesforce/KYC experience. |
| 1 | `/services/app-improvements/` / `/sv/tjanster/forbattra-befintlig-app/` | fix existing web app; React bug fixing developer; hjälp med befintlig app | One defined bug, feature, performance issue or test gap, with explicit acceptance criteria. React is a supported example, not the limit of the offer. |
| 2 | `/services/code-review/` / `/sv/tjanster/kodgranskning/` | independent code review service; technical review existing application; kodgranskning konsult | A bounded review and prioritized findings. Explain the question being reviewed and offer separately scoped implementation. |
| 2 | `/services/internal-tools/` / `/sv/tjanster/interna-verktyg/` | internal tools developer; customer onboarding portal developer; utveckla internt verktyg | The change-request portal story, business workflow, permissions, data model and handover. Separate from API work only when the content supports that distinction. |
| Experiment | `/services/ai-app-review/` / `/sv/tjanster/granska-ai-app/` | AI app code review; help finish AI-built app; hjälp med AI-byggd app | A sample review, prioritized fixes and an explained first engagement. Name builders only where hands-on capability is established. |

Start by drafting the two priority services. Release the app-improvements language pair, then the integration pair with a link to selected work. Add a code-review page once there is a useful sample deliverable. The whole suggested structure is in [SITE-STRUCTURE.md](SITE-STRUCTURE.md).

For every service page, answer: Who is it for? What has usually gone wrong? What will you deliver? How does the first engagement work? What relevant work have you done? What information should the buyer send? Include practical constraints, such as agreed availability and the distinction between planned maintenance and on-call incident response.

Suggested integration title: **API integration consultant in Sweden | Christopher Bengtsson**. Suggested Swedish title: **API-integrationer och systemintegration | Christopher Bengtsson**. These are copy proposals, not validated ranking formulas.

Suggested integration opening: “I help teams connect applications, backend services and business data. Based in Sweden, I am available for smaller, clearly scoped projects, such as improving an existing integration or connecting a specific workflow.” Follow with supported experience, not a generic technology list.

## Broad expertise, small engagement size

Suggested homepage availability: **Available for smaller, clearly scoped projects.** Swedish: **Tillgänglig för mindre, tydligt avgränsade uppdrag.** There is no need to disclose details of the other assignment publicly.

Suggested supporting line: “Senior software engineer helping with new features, existing applications, integrations, automation and technical reviews.” Keep the current broad capabilities; give each a relevant example and route as content becomes ready.

Three suitable starting offers are: diagnose and fix one reproducible issue; implement one defined feature or integration; review a specific technical decision or code area and provide a prioritized report. A small internal tool or AI-app improvement can also fit if its scope is bounded. Do not turn “small project” into “cheap work”: estimate after understanding the code and dependencies.

A public [small React/Node API fix request](https://www.upwork.com/freelance-jobs/apply/Full-Stack-React-Developer-Node-Developer-Needed-for-Small-Web-Application-Fix_~022097300138242975839/) illustrates this engagement shape: one feature, data-loading behavior, error handling and limited backend changes. Its advertised $50 budget is not an appropriate pricing benchmark for senior engineering.

A concise inquiry can ask what needs to change, what exists, the deadline and an optional budget range. Add stack details as optional context rather than making nontechnical buyers complete an engineering questionnaire. Do not promise exact hours, rapid emergency response or ongoing ownership before assessing availability.

## AI discovery and conversations to design for

The Google observations demonstrate that providers can be cited for these buyer questions. They do not establish visibility across AI products. Google says ordinary SEO remains applicable, pages need indexing/snippet eligibility, and no special AI files or schema are required. Its AI-feature traffic is included in Search Console's Web reporting. Keep readable service descriptions, discoverable links and evidence ahead of expanding llms.txt. [Google's AI features guidance](https://developers.google.com/search/docs/appearance/ai-features).

Write useful answers to these plausible buyer conversations:

| Proposed prompt, not measured demand | Content needed |
|---|---|
| “Find a Sweden-based senior developer who can fix a specific issue in our existing React app. We already have a team.” | App-improvements offer, agreed scope, actual availability and relevant experience. |
| “Vi kopierar kunduppgifter mellan formulär och CRM. Kan en frilansare hjälpa oss att automatisera det?” | Integration service, recognizable workflow, assessment questions and a project example. |
| “Should we use Make or hire a developer for a custom integration?” | A balanced guide covering process complexity, failure recovery, maintenance and when off-the-shelf tools suffice. |
| “I built an app with AI. Who can review it before customers use it?” | Review scope, sample findings, implementation option and demonstrable relevant expertise. |
| “We need an internal approval tool, but cannot hire a full-time developer.” | Internal-tools service and the portal example, with a manageable initial scope. |
| “Recommend independent consultants with experience connecting React applications and Salesforce.” | Specific, attributable project evidence and consistent public identity. Avoid implying Salesforce certification or employer endorsement. |

For a baseline, run the same non-branded prompts in fresh search-enabled sessions on selected platforms and record date, platform/model if shown, exact wording, recommended providers and cited URLs. Test branded discoverability separately. Repeat after publication and indexing; a small repeated sample is directional, not market share. An answer that mentions your name without linking is a different result from a visit or qualified inquiry.

## Acquisition beyond Google

**Upwork:** useful for customer language and selective paid engagements. Research terms such as `existing application bug fix`, `API integration`, `code review`, `small feature` and `internal tool`. Prefer bounded deliverables; an Upwork “less than 30 hours” label alone does not establish a suitable workload. Filter for realistic scope, remote eligibility, appropriate hours, budget and evidence you can supply. Present specific offers: diagnose and fix one issue, connect one workflow, or review a defined part of a codebase. Agree a milestone and acceptance criteria before broadening the work. Use an Upwork-native portfolio. Work-example links can support evaluation, but keep pre-contract communication on Upwork as its guidance requires; do not treat it as a funnel to the website contact form. [Upwork contact guidance](https://support.upwork.com/hc/en-us/articles/360051749534-How-to-keep-your-contact-information-safe-on-Upwork).

**Brainville:** a relevant Swedish/Nordic channel for consultant discovery, but secondary while capacity is limited. It exposes both assignments and consultant profiles; assess each listing for genuinely small scope and remote compatibility; even part-time staff augmentation can exceed current capacity. Use the same service language and evidence across profiles. It is an inquiry channel in its own right; website traffic is a secondary benefit. [Brainville](https://www.brainville.com/?lang=en).

**Contra:** has API-focused software and full-stack developer discovery pages. A profile with two concrete work examples is a reasonable small experiment. The observed directories demonstrate available discovery categories, not proven lead quality or demand volume. [Contra API developers](https://contra.com/hire/software-engineers-for-developer-apis).

**LinkedIn, GitHub and relevant professional communities:** the site already links to verified profiles. A useful next experiment is a short post about a specific integration decision or maintenance problem, linking to the relevant case study. Publish a small original demonstration repository if practical. Seek real references and relevant agency partnerships through existing relationships; do not manufacture endorsements or blanket-post links. No outreach or profile edits were performed in this research.

## Measurement and first decision

Define a qualified inquiry as a real project matching your services, capacity and commercial expectations. Keep a simple private inquiry log recording service requested, source if volunteered, fit, proposal and outcome. Evaluate channels by qualified conversations and paid work relative to time spent, not by raw traffic.

For the first 30 days: establish Search Console indexing/query baselines; publish the first service pair and link to selected work; confirm crawlability; record referrals and inquiries. Over the next 60 days: publish the second service pair, distribute the evidence through selected profiles, and inspect which query themes and inquiries emerge. These are execution goals, not promised traffic or revenue targets. Set numerical lead targets once capacity, pricing and a baseline are known.

Current custom analytics accepts homepage paths only and stores no referrer, query string or visitor journey. It cannot attribute a submission to a prior service-page visit. Extend route support deliberately and use aggregate metrics or volunteered source information; do not claim a conversion funnel the current data cannot measure. See [implementation details](IMPLEMENTATION-ROADMAP.md).

The next concrete website change should be **clear small-project availability + an app-improvements page**, then **an integration page linked to selected work**. Keep the broad senior software engineer identity. Ongoing retainers, emergency support, generic tutorial publishing and location-page expansion are lower priorities for the present situation.

Supporting documents: [competitor analysis](COMPETITOR-ANALYSIS.md), [content calendar](CONTENT-CALENDAR.md), [implementation roadmap](IMPLEMENTATION-ROADMAP.md), [site structure](SITE-STRUCTURE.md).
