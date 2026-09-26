# Development reference

The static output is written to `dist/`. The contact endpoint is a Cloudflare Pages Function, so `astro dev` and `astro preview` do not send email. To run the Function locally after building, use Cloudflare’s Pages local development command and provide test values for its environment variables.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/content/web/{en,sv}/home.json` | English and Swedish page copy |
| `src/content/services/{en,sv}/` | Localized service copy |
| `src/lib/page-registry.json` | Stable page IDs, localized paths, publication and indexability |
| `src/pages/` | Home, privacy, service, and sitemap routes |
| `src/layouts/` and `src/container/` | Shared layout and page templates |
| `src/styles/site.css` | Site styles |
| `functions/api/contact.ts` | Contact form submission and email delivery |
| `public/` | Static assets, crawler files, and Pages configuration |
| `artwork/` and `scripts/generate-identity.mjs` | Editable monogram and generated brand assets |
| `tests/` and `scripts/verify-output.py` | Function tests and build checks |

The homepages are `/` and `/sv/`. Privacy pages are `/privacy/` and `/sv/privacy/`; they use `noindex, follow` and are omitted from the sitemap. The three services each have English and Swedish routes, for 10 HTML pages in total. Selected work remains on the homepages. Site identity, the contact address, and professional profile links are defined in `src/lib/site.ts`.

To add a service, add its stable ID and both paths to `src/lib/page-registry.json`, then add one content entry per language with the same `translationKey`. The build requires exactly one non-draft translation for each published route. The registry drives language switching, self-canonicals, hreflang, sitemap coverage and the analytics/contact path allowlists. Privacy stays outside the sitemap. Files in the older `src/content/stories/` directory remain unpublished.

The shared contact form appears on home and service pages. Its allowlisted `source_path` preserves the originating form page through validation, retries and success redirects, and adds page context to the inquiry email. Service experience sections link to the selected work on the localized homepage.

## TypeScript and checks

Application code, shared logic, Pages Functions, and tests use TypeScript. Small configuration and utility scripts remain `.mjs`. Node 24.21.0 runs tests and shared TypeScript imports directly, so modules executed by Node use explicit `.ts` import extensions, `import type`, and erasable TypeScript syntax.

`pnpm check` runs Astro diagnostics plus strict, no-emit TypeScript checks for Functions and tests. Each runtime has a separate configuration: the root config covers Astro and browser code, `functions/tsconfig.json` supplies Cloudflare runtime types, and `tests/tsconfig.json` adds Node types for the test harness. The root exclusion of Functions prevents browser/worker global conflicts; Functions are checked explicitly by the same command. The shared modules are checked in each consuming runtime.

`pnpm test` runs the TypeScript tests with Node's built-in runner. Function tests supply a typed Pages context and mock email and analytics services; browser tests retain their isolated VM harness. No credentials are needed for checks or tests.

## Deployment

Cloudflare Pages builds the `main` branch with `pnpm build` and serves `dist/`. The project targets Node 24.21.0 LTS and pnpm 10.12.4 in Pages. The repository pins Node through `.node-version`; set any Pages `NODE_VERSION` override to `24.21.0` as well. Dashboard settings must be updated separately. `public/_routes.json` sends `/api/contact` and `/api/analytics` to Pages Functions; the remaining routes are static.

The contact Function requires these Pages environment variables:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key; store as a Pages secret |
| `RESEND_FROM_EMAIL` | Verified sender address for the Resend domain |

The Function sends inquiries to `hello@christopherbengtsson.dev` with the visitor's address as `Reply-To`. The deployed domain also needs working mail routing and an abuse rate limit for `/api/contact`. Keep credentials and local `.dev.vars` files out of Git.

## Analytics

Cloudflare Web Analytics covers traffic; Analytics Engine records interactions. Run `pnpm analytics:report` for a local report. See [analytics setup and reference](analytics.md).

## Brand assets

Edit `artwork/monogram.svg`, then regenerate the favicon, touch icon, and localized social previews with:

```sh
pnpm generate:identity
pnpm build
python3 scripts/verify-output.py
```

The generator uses Chrome at its standard macOS path by default. Set `CHROME_BIN` to a Chrome or Chromium executable on other systems. Generated assets are committed under `public/`; Chrome is not needed for a normal build or deployment.
