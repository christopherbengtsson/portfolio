# Christopher Bengtsson consultancy site

Static Astro site in English and Swedish, deployed from `christopherbengtsson/portfolio` to Cloudflare Pages at [christopherbengtsson.dev](https://christopherbengtsson.dev/) and [www.christopherbengtsson.dev](https://www.christopherbengtsson.dev/). Public DNS caches may take time to reflect the 24 September 2026 nameserver change.

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

If development reports missing content fields that are present in the JSON files, run `pnpm run dev --force` to clear Astro’s content cache and restart the development server. Development uses `.astro/data-store.json`, separately from the build cache, so a passing build does not rule out stale development content. Stop any preview server with `pnpm exec astro preview stop` before checking the development URL to avoid testing a different server on the same port through IPv4 versus IPv6.

## Routes and content

The English landing page is `/`; the Swedish version is `/sv/`. Privacy information lives at `/privacy/` and `/sv/privacy/`, with `noindex, follow` metadata and no sitemap entries. Both the footer and contact form link to the matching language’s privacy page. Capabilities, experience, and contact are sections within each landing page. The contact form accepts open project inquiries without a required service category. A successful submission redirects to the same page's `#contact-success` confirmation.

The former Stories pages, content collection, and RSS feeds have been removed. Two unpublished Markdown notes remain under `src/content/stories/` as placeholders; they are not part of the build.

Career descriptions summarize the existing personal site and the supplied résumé facts: Visionite, Trustly, Relight/Headlight, relevant technical work, and the Informatics bachelor’s degree at Örebro University. They are labeled as employment or client work, separate from independent service inquiries. Review the copy against the final résumé before publication.

The original brief specified text-only Open Graph metadata. The subsequent review request updated that requirement: each page now uses a localized, 1200 × 630 PNG preview at an absolute URL, with descriptive `og:image:alt` text. Page titles and descriptions remain localized.

## Cloudflare Pages and email setup

The implementation follows Cloudflare’s [Astro Pages guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/), [Pages Functions guide](https://developers.cloudflare.com/pages/functions/get-started/), [Function routing guidance](https://developers.cloudflare.com/pages/functions/routing/), and [serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/).

The Pages project `portfolio` builds `main` from GitHub with `pnpm build`, output directory `dist`, `PNPM_VERSION=10.12.4`, and `NODE_VERSION=24.12.0`. Both custom domains are active with SSL. Squarespace delegates the domain to Cloudflare nameservers. The old Netlify site's apex and `www` assignments were removed. See [Cloudflare's custom-domain guidance](https://developers.cloudflare.com/pages/configuration/custom-domains/).

The active zone-level Single Redirect rule **Redirect www to apex** matches `http.host eq "www.christopherbengtsson.dev"` and uses the dynamic target `concat("https://christopherbengtsson.dev", http.request.uri.path)`, with **Preserve query string** enabled and status **308**. It applies to HTTP and HTTPS and preserves the request method. Live checks on 24 September 2026 confirmed the root, `/sv/` with a query string, and `/robots.txt` redirect to the corresponding apex URLs; the apex pages and robots file returned 200.

The contact Function uses a Resend sending-only API key restricted to this domain, stored as the Pages `RESEND_API_KEY` secret. `RESEND_FROM_EMAIL` is configured separately; neither value belongs in Git. The recipient is fixed to `hello@christopherbengtsson.dev`; `reply_to` is the validated inquirer address. Cloudflare Email Routing forwards that address to the verified destination. The Resend sending domain and routing rule are active. The Function uses [Resend’s email API](https://resend.com/docs/api-reference/emails/send-email). Two production submissions returned localized success redirects and Resend reported both delivered to the domain's mail server. Confirm final arrival and `Reply-To` in the destination mailbox separately.

The owner should review career claims, availability, scope, working-style statements, and privacy copy against source records. The site is already live; these reviews are follow-up content checks.

`functions/api/contact.js` exports only `onRequestPost`. `public/_routes.json` limits Function invocation to `/api/contact`; every other path is static. The form allows 5,000 message characters; the Function reads no more than 64 KB of encoded form data and uses the form URL's locale hint for errors before parsing. It rejects control characters in the name and email before composing the labeled inquiry email. Validation and delivery errors after parsing return a localized, escaped, prefilled form so the visitor can correct or retry without rewriting the message; those responses use `Cache-Control: no-store`. Each fresh submission receives a random ID. The Function combines that ID with a hash of the exact Resend payload for the `Idempotency-Key`, and the error form carries the ID into a retry. Thus two fresh submissions with identical details have distinct keys, while an unchanged retry from an error form keeps its key. [Resend retains idempotency keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys). A replay of the original static form after a lost HTTP response has no retry ID and can create a second email; distinguishing that replay from a deliberate new inquiry would require a client or server-issued form token. This does not replace the separate Cloudflare abuse rate limit. `public/404.html` prevents Pages from treating unknown paths as a single-page app fallback. `public/_headers` gives hashed `/_astro/*` assets immutable browser caching and other static responses revalidation. Pages itself serves Brotli or Gzip where possible; no custom compression layer is included. For a local Pages runtime smoke test, run `pnpm dlx wrangler@latest pages dev dist --compatibility-date=2026-09-21 --port 8788` after building.

### Free-plan rate limit

The active Cloudflare WAF rule matches `/api/contact`, counts by source IP, allows **5 requests per 10 seconds**, and **blocks for 10 seconds** after the threshold. A production burst returned five validation responses followed by HTTP 429. The Free plan supports path matching and IP counting, with a 10-second counting period and 10-second mitigation period; method matching is not available for this rule tier. With a Cloudflare API token that can read zone rulesets, run `CLOUDFLARE_ZONE_ID=... CLOUDFLARE_API_TOKEN=... pnpm check:rate-limit` to confirm the rule. Review the threshold after observing legitimate traffic and false positives. The `pages.dev` hostname is outside the zone rule and remains a possible bypass. See Cloudflare’s [current plan table](https://developers.cloudflare.com/waf/rate-limiting-rules/), [rate-limit parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/), and [zone ruleset API setup](https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/).

Cloudflare Security Events identifies the observed `Python-urllib/3.14` HTTP 403 / error 1010 requests as **Browser integrity check** blocks. This is a client-signature finding, not evidence that verified search crawlers are blocked. On 24 September 2026, AI Crawl Control's **Last 7 days** view showed 19 crawler-classified requests: 14 HTTP 200 and five HTTP 404. The site had been live for only a few hours, so this is a small launch-period sample, not seven days of observed traffic. The dashboard listed ClaudeBot, GPTBot, and ChatGPT-User among the crawlers. The 200 responses show some AI crawler access; the 404 responses alone do not indicate a security block. These metrics do not establish Googlebot access or indexing; check Google Search Console's live URL inspection separately.

## Local verification result

On 24 September 2026, `pnpm check`, `pnpm test` (14 passing), `pnpm build`, and `python3 scripts/verify-output.py` passed. The output validator checked exactly two landing pages, their section links and forms, canonical and reciprocal language links, localized Open Graph images and alt text, Person and WebSite JSON-LD, the two-URL sitemap, and absence of old pages and RSS feeds. Browser checks passed at 375, 768, and 1440 pixels, including horizontal overflow, headings, keyboard access, the four capability cards, and the landing-page confirmation message. The confirmation is also visible without JavaScript. The generated landing pages use a small inline confirmation script and one CSS bundle before compression. The live custom domain serves both languages, `robots.txt`, sitemap, `llms.txt`, and a real 404. The production contact Function returned English and Swedish 303 success redirects and a localized validation error.
