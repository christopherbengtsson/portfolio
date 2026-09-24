# Production readiness TODO

The site builds and passes local checks. **Do not publish the replacement site until the items below are complete.** See [README.md](README.md) for build and verification details.

## Content and privacy

- [ ] Verify career dates, roles, technical claims, and the Informatics degree against the final résumé.
- [ ] Review and approve the landing pages' availability, scope and working-style statements before publication.
- [x] Draft privacy information in English and Swedish, linked beside both landing-page forms, using Christopher as controller and 12 months for unanswered inquiries. Owner should review the wording before publication. Sweden’s privacy authority says this information should be available when personal data is collected: [IMY guidance](https://www.imy.se/privatperson/dataskydd/dina-rattigheter/ratt-till-information/).

## Hosting and email

- [x] Commit the site to `christopherbengtsson/portfolio` and connect it to a Cloudflare Pages project.
- [x] Configure Pages with `pnpm build`, output directory `dist`, `PNPM_VERSION=10.12.4`, and Node 24.12.0. Production branch is `main` with automatic deployments; the hosted build succeeded.
- [ ] Finish the `christopherbengtsson.dev` cutover. The old Netlify project is detached from apex and `www`. The three Resend records exist in both DNS zones, and the four stale web A records were removed from Cloudflare. Squarespace nameservers were changed to Cloudflare on 24 September 2026 at 18:09 CEST; wait for the zone to activate, then attach apex and `www` in Pages, letting Pages create their CNAME records. Verify DNS and HTTPS. Follow [Cloudflare’s custom-domain setup](https://developers.cloudflare.com/pages/configuration/custom-domains/).
- [ ] Configure Cloudflare Email Routing for `hello@christopherbengtsson.dev` to forward to the already-verified Hotmail destination, then verify actual delivery. Resend sending domain is verified; a sending-only API key restricted to the domain is stored as a Pages secret, and `RESEND_FROM_EMAIL` is configured. Email Routing needs the Cloudflare zone to activate. The current authoritative DNS has no MX record.
- [x] Configure the Cloudflare Free-plan WAF rate-limit rule for `/api/contact`: count by IP, 5 requests per 10 seconds, Block for 10 seconds. The dashboard shows the rule active. After the custom domain is attached, exercise a burst through that hostname to verify the edge block. The `pages.dev` hostname is outside this zone rule and remains a potential bypass; consider access restrictions or app-level abuse protection if the public preview receives unwanted submissions. See [Cloudflare’s plan table](https://developers.cloudflare.com/waf/rate-limiting-rules/).

## Hosted preview acceptance

- [x] Build and deploy the site on `portfolio-33y.pages.dev` from GitHub, and confirm English/Swedish 200 responses, unknown-path 404, and a localized hosted Function 400.
- [ ] Send a real inquiry from both language forms. Check mailbox delivery, message content, `Reply-To`, and the localized `303` redirects to the landing-page confirmation messages. Submit the same details as a fresh inquiry and confirm a second email arrives. Retry with the same error-form submission ID and unchanged details to confirm Resend delivers only one email within its 24-hour idempotency window; change the message and confirm it creates a separate email.
- [ ] Check localized `400` validation and `503` delivery-error responses on the hosted Function. Confirm the retry form retains a long message safely, rejects a newline in the name, and works without JavaScript. Check honeypot behavior.
- [ ] Verify that only `/api/contact` invokes the Function; inspect HTML revalidation, immutable hashed-asset caching, and Brotli/Gzip responses.
- [ ] Recheck both public pages, language links, section anchors, canonical URLs, localized Open Graph preview images, `robots.txt`, `llms.txt`, sitemap, and 404 behavior on the preview. Confirm the old separate content routes and RSS feeds are absent.
- [ ] Approve the production cutover and run a short post-cutover smoke test, including a real inquiry and a rollback check.

Business details remain unverified, so `ProfessionalService` JSON-LD is intentionally absent.
