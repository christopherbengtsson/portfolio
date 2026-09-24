# Production readiness TODO

The site builds and passes local checks. **Do not publish the replacement site until the items below are complete.** See [README.md](README.md) for build and verification details.

## Content and privacy

- [ ] Verify career dates, roles, technical claims, and the Informatics degree against the final résumé.
- [ ] Review and approve the landing pages' availability, scope and working-style statements before publication.
- [x] Draft privacy information in English and Swedish, linked beside both landing-page forms, using Christopher as controller and 12 months for unanswered inquiries. Owner should review the wording before publication. Sweden’s privacy authority says this information should be available when personal data is collected: [IMY guidance](https://www.imy.se/privatperson/dataskydd/dina-rattigheter/ratt-till-information/).

## Hosting and email

- [ ] Commit the site to `christopherbengtsson/portfolio` and connect it to a Cloudflare Pages project.
- [ ] Configure Pages with `pnpm build`, output directory `dist`, `PNPM_VERSION=10.12.4`, and a supported Node version. Confirm preview and production branch settings.
- [ ] Migrate `christopherbengtsson.dev` from Netlify DNS to Cloudflare DNS for the Pages apex domain. The old Netlify project has already been detached from apex and `www`; its Netlify DNS zone remains authoritative pending the nameserver change. The three Resend records are present in both zones. Replace the four stale web A records in the Cloudflare zone with Pages records, add mail routing, then change nameservers at the registrar. Include `www` in the cutover plan. Follow [Cloudflare’s custom-domain setup](https://developers.cloudflare.com/pages/configuration/custom-domains/) and [Netlify’s DNS-record guidance](https://docs.netlify.com/manage/domains/manage-domains/manage-dns-records/).
- [ ] Complete Resend's pending DNS verification. Set `RESEND_API_KEY` as a Pages secret and `RESEND_FROM_EMAIL` to an address on the verified domain. Configure Cloudflare Email Routing for `hello@christopherbengtsson.dev` to forward to the Netlify login email (Hotmail), then verify actual delivery. The current authoritative DNS has no MX record.
- [ ] Configure the Cloudflare Free-plan WAF rate-limit rule for `/api/contact`: count by IP, 5 requests per 10 seconds, Block for 10 seconds. **This is a publication blocker:** the Function has no abuse limit until the edge rule is active. Run `pnpm check:rate-limit` with `CLOUDFLARE_ZONE_ID` and a read-only `CLOUDFLARE_API_TOKEN`. Exercise a burst of valid test requests through a hostname in that Cloudflare zone and confirm that Cloudflare blocks excess traffic before Resend is called; a `pages.dev` preview alone does not test the zone rule. Cloudflare counters can update with a short delay, so do not assume an exact delivery count. Confirm the final settings in [Cloudflare’s plan table](https://developers.cloudflare.com/waf/rate-limiting-rules/).

## Hosted preview acceptance

- [ ] Build and deploy a nonproduction Pages preview after deployment is authorized.
- [ ] Send a real inquiry from both language forms. Check mailbox delivery, message content, `Reply-To`, and the localized `303` redirects to the landing-page confirmation messages. Submit the same details as a fresh inquiry and confirm a second email arrives. Retry with the same error-form submission ID and unchanged details to confirm Resend delivers only one email within its 24-hour idempotency window; change the message and confirm it creates a separate email.
- [ ] Check localized `400` validation and `503` delivery-error responses on the hosted Function. Confirm the retry form retains a long message safely, rejects a newline in the name, and works without JavaScript. Check honeypot behavior.
- [ ] Verify that only `/api/contact` invokes the Function; inspect HTML revalidation, immutable hashed-asset caching, and Brotli/Gzip responses.
- [ ] Recheck both public pages, language links, section anchors, canonical URLs, localized Open Graph preview images, `robots.txt`, `llms.txt`, sitemap, and 404 behavior on the preview. Confirm the old separate content routes and RSS feeds are absent.
- [ ] Approve the production cutover and run a short post-cutover smoke test, including a real inquiry and a rollback check.

Business details remain unverified, so `ProfessionalService` JSON-LD is intentionally absent.
