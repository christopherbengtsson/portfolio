# Analytics

Cloudflare Web Analytics is already configured through automatic setup for the production domain. Do not add another beacon. Custom interactions use Analytics Engine separately and do not appear as custom events in the Web Analytics dashboard.

After deployment is authorized, configure these **production** settings on the `portfolio` Pages project, then redeploy:

| Setting | Value |
| --- | --- |
| Analytics Engine binding | `SITE_ANALYTICS` → dataset `portfolio_interactions` |
| Environment variable | `ANALYTICS_ENABLED=true` |

No binding is needed in preview. Both the client and server restrict collection to `https://christopherbengtsson.dev`, and only the two homepages send browser events. Local and preview visits do not enter production data. Analytics errors never block interactions or contact delivery. To stop writes, set `ANALYTICS_ENABLED=false` and redeploy; remove the client initializer as well if requests should stop completely.

Browser events are counted once per event/target per document load, using memory only. A reload starts fresh; back/forward cache restoration keeps that document's counts. Section reach means a heading is at least 50% visible, or the visitor expands a services card. Capability IDs are stable across languages and copy changes. Only user-activated openings count; closing, repeated toggling, and browser find-in-page disclosure do not. A form start is the first input event in a visible contact field, not a field value. Successful submissions are counted after Resend accepts the request, including submissions without JavaScript. They are successful requests, not unique inquiries or confirmation of inbox delivery; replays of an accepted request can add counts.

The public endpoint accepts only fixed event labels, targets, locale and homepage path, with a maximum 1 KB JSON body and same-origin checks. It does not accept client-side success events. No visitor identifier, form contents, IP address, user-agent string, query string, or referrer is stored in the custom dataset. The endpoint is public; origin checks and validation do not authenticate events or prevent a determined client from fabricating them. Each valid request consumes a Functions request and at most one data point, so review shared account usage and abnormal traffic before rollout. Keep the existing contact rate limit in place.

Dataset v1 uses `index1=christopherbengtsson.dev`; `blob1` is version `1`, `blob2` event, `blob3` locale, `blob4` homepage path, and `blob5` target. Cloudflare supplies the timestamp. Events are `section_view`, `capability_expand`, `contact_click`, `email_click`, `form_start`, `form_success`, and `profile_click`. The fixed browser targets live in `src/lib/analytics-events.js`; server success always targets `contact`. Queries must weight counts with `_sample_interval`.

## Local report

Supply `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ANALYTICS_READ_TOKEN` in your shell or the ignored `.dev.vars` file. The token needs **Account Analytics Read**, restricted to the relevant account. Do not put the token into Pages variables, public code, or Git. Creating a new token is a separate account-access action to authorize during rollout.

```sh
pnpm analytics:report
pnpm analytics:report --days 7 --locale sv
```

The report prints Markdown tables with daily events, section reach, capability interest, contact actions, and profile clicks. The default is a rolling 30-day window in UTC; supported ranges are 1–90 days. The language filter is optional. Counts and ratios describe aggregate events rather than linked visitor journeys; sampling, blocked requests, and period boundaries can affect ratios. Use the existing Web Analytics dashboard for traffic totals. Analytics Engine retains data for three months; no archive is maintained. The dataset becomes queryable after the first write, so an empty new dataset can return an API error before then.

After an authorized rollout, perform a controlled capability expansion, record the UTC smoke-test time, and confirm its labels in the report. Verify the live page still has exactly one Cloudflare Web Analytics beacon. Test contact success through the mocked tests rather than sending an unsolicited live email. Cloudflare does not support a local Analytics Engine binding; `pnpm test` exercises writes with a stub. No live data is needed for these tests.
