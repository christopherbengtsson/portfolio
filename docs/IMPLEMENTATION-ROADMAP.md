# Implementation and measurement roadmap

26 September 2026. Research roadmap, followed by local implementation. The three bilingual service pages, homepage selected-work links, shared contact form, page registry, metadata, sitemap and page-level analytics are implemented. Deployment and account configuration remain pending. The phased plan below retains the original research context; later guides, profile work and measurement require follow-up. The user subsequently chose to remove separate work routes: selected assignments remain on the homepages, with relevant experience summarized on service pages. There are 10 HTML pages and 8 indexable URLs.

## Phase 1 — foundation, weeks 1–4

1. Use the confirmed broad senior software engineer positioning and smaller-project focus. Change availability copy to “Available for smaller, clearly scoped projects.” Define hours, price and deadline per engagement rather than inventing general commitments.
2. Generalize `src/layouts/SiteLayout.astro`: it currently accepts only home/privacy, derives canonical and translated URLs from that choice, and uses it for section navigation. Supply explicit canonical path and real translation mapping for service/work/guide pages. Ensure a service is never canonicalized to `/` or `/sv/`.
3. Add page content/routes and supporting case-study content. `src/content.config.ts` currently registers only the web homepage collection; the Markdown stories are not registered or routed. Choose a simple typed route/content registry shared by layout, sitemap and navigation.
4. Expand `src/pages/sitemap.xml.ts`, which currently enumerates only the two homepages. Include published canonical content and only real translation pairs; exclude drafts and noindex privacy pages.
5. Decide measurement before launch. `src/util/AnalyticsUtil.ts` and `src/lib/analytics-events.js` permit homepage paths only. Update both sides and the endpoint tests if adding service-page events. The existing server-side form success records homepage-oriented locale/path semantics; inspect it before introducing route attribution. Update the privacy description if collection changes.
6. Publish the app-improvements service pair with working contact links, then the integration service and substantiated project story. Add a bounded code-review offer once a sample report is ready. Account configuration and production verification remain separate from a passing local build.

Validation when implementing: run the repository's documented check/test/build/output-verification commands; extend meaningful checks for self-canonicals, reciprocal language pairs, sitemap coverage, internal links, draft exclusion and valid analytics paths. Inspect desktop/mobile rendering and test contact behavior with mocks. Use Search Console live URL inspection and verified crawler evidence to establish actual access; robots permission alone is insufficient.

## Phase 2 — expansion, weeks 5–12

Publish the portal story and one buyer decision guide. Improve selected marketplace/professional profiles with the same verifiable evidence. Record lead fit and commercial outcome. Trial AI app reviews only after producing a credible demonstration. See [CONTENT-CALENDAR.md](CONTENT-CALENDAR.md).

## Phase 3 — refine, weeks 13–24

Choose the service attracting useful inquiries. Address real objections and specific integration/use-case questions. Obtain attributable client references when available. Add another service page only if it serves a distinct buying decision. Pursue relevant professional relationships and original technical artifacts rather than bulk directory links.

## Phase 4 — authority, months 7–12

Build a small body of case studies, practical guides and corroborating work. Expand topics or languages according to actual buyers. Reassess route consolidation when pages compete for the same intent. Longer-term publication volume should follow evidence and capacity, not a calendar quota.

## Measurement contract

| Metric | Current baseline | First target / decision rule |
|---|---|---|
| Published indexable pages | Two homepages in source sitemap; Google indexing unverified | Verify every new canonical page in Search Console after release; investigate exclusions individually. |
| Qualified inquiries | Unknown | Establish a 30-day log; set a numerical target from capacity and observed lead quality. |
| Service query impressions/clicks | Unknown | Track branded separately from non-branded; inspect country, language and query intent. |
| Proposals and paid engagements | Unknown | Record counts and source where known; prioritize channels producing commercial fit. |
| Acquisition effort | Unknown | Log profile/proposal/content time per channel; compare with qualified conversations. |
| AI mentions and cited URLs | Two Google query snapshots only; no cross-platform baseline | Run a fixed prompt set in fresh sessions; retain exact questions and citations. Do not label this AI market share. |
| Page/contact events | Instrumentation exists; production data not inspected | Validate new routes end to end. Aggregate click/submission ratios are not unique-user conversion rates. |
| Core Web Vitals | Not measured | Establish field data when available; otherwise use lab diagnostics without representing them as field results. |

Use Search Console for indexation and search queries, Cloudflare Web Analytics for available traffic/referrer reports, and the existing custom events for aggregate engagement. Referrals can be missing, and the current custom dataset stores neither referrers nor UTM parameters. It cannot connect individual page visits to inquiries. Optional self-reported source can help, but should not be required to contact you.

At 30 days, confirm publication, crawl/index status and usable measurement. At 60–90 days, diagnose the constraint: no impressions suggests discovery/content fit needs attention; irrelevant queries suggest intent mismatch; relevant visits without inquiries suggest the offer/proof/contact path needs work. Small samples require patience and qualitative feedback, not automatic page deletion.
