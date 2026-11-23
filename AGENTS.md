<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

- **Status:** Production-bound project, live at `https://wingspanscoresheet.vercel.app/`. Follow Jordan's full production process from the global agent rules.
- **Default branch:** `master`. Never commit directly to `master`; Vercel deploys `master` to production.
- **Checks before review:** Run `npm run check` (lint, typecheck, and unit tests), `npm run build`, and `npm run test:e2e` (Playwright End-to-End (E2E) browser tests).
- **Pull requests:** Open every pull request with `For users:` and `Route:` per the `full-stop` skill, run an outside review with `codex-loop` before filing, watch Continuous Integration (CI), and stop at ready for merge unless Jordan explicitly says `"full send"` or `"merge"`.
- **Post-deploy live check:** `.github/workflows/live-check.yml` opens the live site read-only after each Production deploy and files a GitHub issue if it fails.

