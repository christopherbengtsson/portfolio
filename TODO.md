# Follow-up checks after launch

The replacement site is live on Cloudflare Pages. See [README.md](README.md) for its configuration and verification.

## Owner review

- [ ] Check career dates, roles, technical claims, and the Informatics degree against the final résumé.
- [ ] Review availability, scope, and working-style statements on both landing pages.
- [ ] Review the English and Swedish privacy wording. It names Christopher personally as controller and says unanswered inquiries are kept for 12 months. Sweden’s privacy authority describes the information required at collection: [IMY guidance](https://www.imy.se/privatperson/dataskydd/dina-rattigheter/ratt-till-information/).
- [ ] Check that the two one-time setup inquiries arrived in the destination Hotmail mailbox and that `Reply-To` is correct. Resend reported delivery to the domain mail server; this does not prove inbox placement after Cloudflare forwarding.

## Operational follow-up

- [ ] Recheck public recursive DNS caches after the Squarespace nameserver change. The `.dev` parent and Google DNS already delegate to Cloudflare, but some resolvers may retain old Netlify answers until their TTL expires.
- [x] Review Cloudflare Email Routing activity for the two setup messages. Both show **Forwarded**, with SPF and DKIM passing.
- [ ] Decide whether to restrict the `portfolio-33y.pages.dev` preview hostname. The active WAF rate-limit rule protects `/api/contact` on the custom domain but does not cover that hostname.
- [ ] Inspect the site's content and Open Graph previews on the live domain after DNS settles. The deployed pages, localized metadata, sitemap, `robots.txt`, `llms.txt`, and 404 were checked by HTTP.

Business details remain unverified, so `ProfessionalService` JSON-LD is intentionally absent.
