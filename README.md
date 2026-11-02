# Event Control · Desbravando UTV

[Português](README.pt-BR.md) · English

Management system for off-road UTV expeditions run by Desbravando UTV. One web app replaces
a set of spreadsheets: logistics checklist, participants, receivables, costs and suppliers,
lodging, field schedule and team tasks. The team uses it on the phone, in the field.

## Status

In production since July 2026 at `eventos.desbravando-utv.workers.dev`.

Known gap (checked 2026-11-01): the version live since 2026-10-21 was published from another
copy of the code that is not in this repository. `main` and production differ again. See
[docs/ARQUITETURA.md §11](docs/ARQUITETURA.md) before any deploy.

## The problem it solves

The operation sold expeditions, tracked logistics, collected payments in installments and
estimated costs in separate spreadsheets that several people edited at the same time.
Formulas broke and edits overwrote each other. This app puts the whole expedition cycle in
one place, with per-field saves so several people can edit at once.

## Stack

- Cloudflare Worker (`worker.js`), plain JavaScript, no framework and no build step
- Cloudflare D1 (SQLite) for data
- Cloudflare R2 for attachments (binding `ANEXOS`)
- Single-file front end (`ui.html`) served by the Worker
- MCP server with OAuth 2.1 (`mcp.js`) so Claude can operate the system
- Public forms (`cardapio.js`) served by a separate Worker (`worker-cardapio.js`)

## Run locally

Requires Node 20 or newer.

```bash
npm install
npx wrangler d1 execute eventos --local --file=schema.sql
npx wrangler dev
```

Local keys go in `.dev.vars` (ignored by git):

```
APP_KEY=any-local-admin-key
TEAM_KEY=any-local-team-key
```

## Tests

```bash
npm test          # API suite against a local `wrangler dev` (login, per-person permission, event CRUD, R2 attachment)
npm run travas    # pre-deploy checks: UI compiles, worker rules, zip export, public form
npm run travas:tela   # opens every tab in Chromium (needs Playwright from the qa-parresia checkout)
```

`npm test` creates a temporary local D1 from `schema.sql`, uses test keys and never touches
production.

## Folder structure

| Path | What it is |
|---|---|
| `worker.js` | API (`/api/*`), login, permissions and serving the UI |
| `ui.html` | The whole interface, one file |
| `mcp.js` | MCP connector and OAuth endpoints |
| `auditoria.js` | Audit log of every write |
| `briefing.js` | Design brief per expedition |
| `cardapio.js`, `worker-cardapio.js`, `wrangler.cardapio.toml` | Public forms Worker |
| `marca.js` | Brand vector used by the public forms |
| `schema.sql` | Database structure for a fresh install |
| `migrations/` | Incremental SQL changes, in order (see `migrations/README.md`) |
| `seeds/` | SQL that creates forms and the operations playbook |
| `tools/` | Pre-deploy checks and helper scripts |
| `tests/` | Automated API tests |
| `docs/` | Architecture, roadmap, history, diagrams |

## Architecture

Request flow, modules, database and roles are in [docs/ARQUITETURA.md](docs/ARQUITETURA.md)
(Portuguese). Diagrams are in [docs/arquitetura/](docs/arquitetura/).

## Decisions and known limits

- `worker.js` and `mcp.js` were recovered from the production bundle on 2026-10-14. They
  run and read fine, but the bundler removed comments and added `__name()` wrappers.
- Personal data (ID numbers, phone, payments) never goes into git. Real data seeds and
  database backups are ignored by `.gitignore`.
- Access keys and signing keys are Wrangler secrets, never in code.
- Migrations are applied by hand with `wrangler d1 execute`. They are not managed by
  `wrangler d1 migrations` yet.
- The public form route is the only route that writes without a session. `POST
  /oauth/register` also accepts requests without a session, as dynamic client registration
  requires.

## License

All rights reserved. Published as portfolio; not licensed for reuse. See [LICENSE](LICENSE).
