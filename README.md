# Christopher Bengtsson

Source for [christopherbengtsson.dev](https://christopherbengtsson.dev/), a bilingual consultancy site built with [Astro](https://astro.build/) and deployed to Cloudflare Pages.

## Run locally

Use Node.js 22.16 or newer and pnpm 10.12.4.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Astro serves the site at `http://localhost:4321`. To check a production build:

```sh
pnpm check
pnpm test
pnpm build
python3 scripts/verify-output.py
pnpm preview
```

The static output is written to `dist/`. The contact endpoint is a Cloudflare Pages Function, so `astro dev` and `astro preview` do not send email. To run the Function locally after building, use Cloudflare's Pages local development command and provide test values for its environment variables.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/content/web/{en,sv}/home.json` | English and Swedish page copy |
| `src/pages/` | Home, privacy, and sitemap routes |
| `src/layouts/` and `src/container/` | Shared layout and page templates |
| `src/styles/site.css` | Site styles |
| `functions/api/contact.js` | Contact form submission and email delivery |
| `public/` | Static assets, crawler files, and Pages configuration |
| `artwork/` and `scripts/generate-identity.mjs` | Editable monogram and generated brand assets |
| `tests/` and `scripts/verify-output.py` | Function tests and build checks |

The homepages are `/` and `/sv/`. Privacy pages are `/privacy/` and `/sv/privacy/`; they use `noindex, follow` and are omitted from the sitemap. Site URLs, the contact address, and professional profile links are defined in `src/lib/site.ts`.

## Deployment

Cloudflare Pages builds the `main` branch with `pnpm build` and serves `dist/`. The project uses Node 24.12.0 and pnpm 10.12.4 in Pages. `public/_routes.json` sends only `/api/contact` to the Pages Function; the remaining routes are static.

The contact Function requires these Pages environment variables:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key; store as a Pages secret |
| `RESEND_FROM_EMAIL` | Verified sender address for the Resend domain |

The Function sends inquiries to `hello@christopherbengtsson.dev` with the visitor's address as `Reply-To`. The deployed domain also needs working mail routing and an abuse rate limit for `/api/contact`. Keep credentials and local `.dev.vars` files out of Git.

## Brand assets

Edit `artwork/monogram.svg`, then regenerate the favicon, touch icon, and localized social previews with:

```sh
pnpm generate:identity
pnpm build
python3 scripts/verify-output.py
```

The generator uses Chrome at its standard macOS path by default. Set `CHROME_BIN` to a Chrome or Chromium executable on other systems. Generated assets are committed under `public/`; Chrome is not needed for a normal build or deployment.
