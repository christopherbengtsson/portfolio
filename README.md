# Christopher Bengtsson

Source for [christopherbengtsson.dev](https://christopherbengtsson.dev/), a bilingual Astro site hosted on Cloudflare Pages.

Use Node.js 22.16+ and pnpm 10.12.4.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Local site: <http://localhost:4321>.

## Verify

```sh
pnpm check
pnpm test
pnpm build
python3 scripts/verify-output.py
```

Run `pnpm preview` to view the production build. Local Astro previews do not send contact emails.

See [development reference](docs/development.md) for content, deployment and brand assets, or [analytics](docs/analytics.md) for reporting.
