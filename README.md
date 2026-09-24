# Christopher Bengtsson consultancy site

Static Astro site in English and Swedish, intended for Cloudflare Pages.

## Local work

Use pnpm 10.12.4 and Node 22.16 or newer. The tested local environment used Node 24.12.0.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
python3 scripts/verify-output.py
pnpm preview --host 127.0.0.1
```

The static build writes to `dist/`. The landing pages have a small inline script to focus the contact confirmation after redirect. `scripts/inspect-browser.mjs` checks both languages in Chrome at 375, 768, and 1440 pixels; run it while the development or preview server is listening on `127.0.0.1:4321`. The project-local Astro Docs MCP configuration is in `.codex/config.toml` for future Codex sessions, following [Astro’s Build with AI guide](https://docs.astro.build/en/guides/build-with-ai/#astro-docs-mcp-server).

## Routes and content

The English landing page is `/`; the Swedish version is `/sv/`. These are the only generated HTML pages. Capabilities, experience, and contact are sections within each landing page. The contact form accepts open project inquiries without a required service category. A successful submission redirects to the same page's `#contact-success` confirmation.

The former Stories pages, content collection, and RSS feeds have been removed. Two unpublished Markdown notes remain under `src/content/stories/` as placeholders; they are not part of the build.

Career descriptions summarize the existing personal site and the supplied résumé facts: Visionite, Trustly, Relight/Headlight, relevant technical work, and the Informatics bachelor’s degree at Örebro University. They are labeled as employment or client work, separate from independent service inquiries. Review the copy against the final résumé before publication.

The original brief specified text-only Open Graph metadata. The subsequent review request updated that requirement: each page now uses a localized, 1200 × 630 PNG preview at an absolute URL, with descriptive `og:image:alt` text. Page titles and descriptions remain localized.

## Cloudflare Pages setup, before publication

The implementation follows Cloudflare’s [Astro Pages guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/), [Pages Functions guide](https://developers.cloudflare.com/pages/functions/get-started/), [Function routing guidance](https://developers.cloudflare.com/pages/functions/routing/), and [serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/).

1. Connect the chosen public GitHub repository `christopherbengtsson/portfolio` to a Cloudflare Pages project and deploy a preview before moving the domain. Set the build command to `pnpm build` and output directory to `dist`. Set `PNPM_VERSION=10.12.4` in the Pages build environment so the lockfile is read by the same pnpm major version. Configure a supported Node release (the tested version is `24.12.0`; `NODE_VERSION` or `.node-version` is supported by Pages). The apex domain still uses Netlify DNS, but its assignment to the old Netlify project has been removed. Cloudflare Pages requires Cloudflare nameservers for an apex custom domain. Copy all required DNS records, including mail and Resend records, into the Cloudflare zone before changing nameservers at the registrar. See [Cloudflare's custom-domain guidance](https://developers.cloudflare.com/pages/configuration/custom-domains/) and [Netlify's nameserver guidance](https://docs.netlify.com/manage/domains/configure-domains/netlify-name-servers/).
2. Verify the sending domain in Resend. Set Pages environment variables `RESEND_API_KEY` (secret) and `RESEND_FROM_EMAIL` (a sender address on the verified domain, for example a formatted `Name <address@domain>` value). Do not commit these values. The recipient is fixed to `hello@christopherbengtsson.dev`; `reply_to` is the validated inquirer address. The Function uses [Resend’s email API](https://resend.com/docs/api-reference/emails/send-email).
3. Deploy a preview and send a real inquiry in both languages. Confirm the actual mailbox receives it, that `Reply-To` is correct, and that 400 and 503 pages are readable. The local tests mock provider delivery; they do not prove real email delivery.
4. Review the final independent-project terms and any legal or privacy copy before publishing the replacement site. The page's availability, scope and working-style statements need owner review.

`functions/api/contact.js` exports only `onRequestPost`. `public/_routes.json` limits Function invocation to `/api/contact`; every other path is static. The form allows 5,000 message characters; the Function reads no more than 64 KB of encoded form data and uses the form URL's locale hint for errors before parsing. It rejects control characters in the name and email before composing the labeled inquiry email. Validation and delivery errors after parsing return a localized, escaped, prefilled form so the visitor can correct or retry without rewriting the message; those responses use `Cache-Control: no-store`. Each fresh submission receives a random ID. The Function combines that ID with a hash of the exact Resend payload for the `Idempotency-Key`, and the error form carries the ID into a retry. Thus two fresh submissions with identical details have distinct keys, while an unchanged retry from an error form keeps its key. [Resend retains idempotency keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys). A replay of the original static form after a lost HTTP response has no retry ID and can create a second email; distinguishing that replay from a deliberate new inquiry would require a client or server-issued form token. This does not replace the separate Cloudflare abuse rate limit. `public/404.html` prevents Pages from treating unknown paths as a single-page app fallback. `public/_headers` gives hashed `/_astro/*` assets immutable browser caching and other static responses revalidation. Pages itself serves Brotli or Gzip where possible; no custom compression layer is included. For a local Pages runtime smoke test, run `pnpm dlx wrangler@latest pages dev dist --compatibility-date=2026-09-21 --port 8788` after building.

### Free-plan rate limit to configure

Create the one Cloudflare WAF rate limiting rule available on the Free plan for path `/api/contact`, counted by source IP. Use **5 requests per 10 seconds**, **Block** action, and a **10-second mitigation timeout**. The Free plan supports path matching and IP counting, with a 10-second counting period and 10-second mitigation period; method matching is not available for this rule tier. This route is the only dynamic endpoint, so path matching is sufficient. The site must not be published until this rule is active: the honeypot alone does not limit automated requests. With a Cloudflare API token that can read zone rulesets, run `CLOUDFLARE_ZONE_ID=... CLOUDFLARE_API_TOKEN=... pnpm check:rate-limit` to confirm the rule. Review the threshold after observing legitimate traffic and false positives. See Cloudflare’s [current plan table](https://developers.cloudflare.com/waf/rate-limiting-rules/), [rate-limit parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/), and [zone ruleset API setup](https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/).

## Local verification result

On 23 September 2026, `pnpm check`, `pnpm test` (14 passing), `pnpm build`, and `python3 scripts/verify-output.py` passed. The output validator checked exactly two landing pages, their section links and forms, canonical and reciprocal language links, localized Open Graph images and alt text, Person and WebSite JSON-LD, the two-URL sitemap, and absence of old pages and RSS feeds. Browser checks passed at 375, 768, and 1440 pixels, including horizontal overflow, headings, keyboard access, the four capability cards, and the landing-page confirmation message. The confirmation is also visible without JavaScript. The generated landing pages use a small inline confirmation script and one CSS bundle before compression. A hosted Pages preview and real contact delivery have not been checked for this revision.
