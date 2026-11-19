# Contributing to Blob Office

Thanks for stopping by! Blob Office is small on purpose: plain Node.js, no dependencies, no build step. That makes it a friendly place for a first open source contribution.

한국어로 이슈와 PR을 써도 괜찮아요. Issues and PRs in Korean or English are both welcome.

## Run it locally

```bash
git clone https://github.com/dingcodingco/hermes-blob-office
cd hermes-blob-office
node bin/blob-office.js       # demo mode, no Hermes needed
npm test                      # node --test, about 4 seconds
```

You do **not** need Hermes or an API key to work on most things. Demo mode (`server/demo.js`) drives every state the office can show. Add `?scene=chat&agent=card`, `?scene=meeting`, `?scene=kanban` or `?scene=skills` to the URL to jump straight to a screen. Set `OFFICE_DEMO_STILL=1` to stop the demo from changing on its own.

## Where things live

| Path | What it does |
|---|---|
| `bin/blob-office.js` | CLI entry (`--hermes`, `--port`) |
| `server/index.js` | HTTP server, static files, Server-Sent Events |
| `server/demo.js` | Demo mode with sample data that keeps itself busy |
| `server/hermes.js` | Hermes mode: reads the `hermes` CLI, talks to the API server |
| `server/layout.js` | Picks each bot's floor, look and slot; opens building 2, 3… |
| `public/app.js` | Building view, walking/elevator movement, side panel |
| `public/bots.js` | Draws a blob bot (shape, eyes, poses) as SVG |
| `public/props.js` | Job props a bot holds (envelope, camera, …) |
| `public/assets/building.png` | Building background (floor lines are in `FLOOR_Y` in `app.js`) |
| `office.config.json` | Bot names, jobs, floors |
| `test/` | `node:test` tests and a fake Hermes CLI |

## Good first contributions

- **A new prop.** See below.
- **A new building theme** (night, rainy day). Keep the floor lines where `FLOOR_Y` expects them, or update `FLOOR_Y`, `SLOT_X`, `LIFT_X`.
- **Translations** of the UI strings in `public/app.js` and `server/i18n.js`.
- **Docs and screenshots** in your language.
- **Bug reports** with steps to reproduce. Please include your Node.js and Hermes versions.

## Adding a prop

1. Add a function to `EXTRA_ACC` in `public/props.js`. It returns SVG drawn in the bot's 200×200 box; use `HAND(...)` for something held at the lower right, or `TOP[b.shape]` for something on the head.
2. Add the prop name and its job words to `PROP_WORDS` in `server/layout.js`, and to a floor's `props` if it should be a default.
3. Run the demo with `"prop": "<name>"` on a bot and check every state (idle, work, walk, done).

## Pull requests

- Keep PRs small and focused. One idea per PR is easiest to review.
- No new runtime dependencies, please. If you think one is needed, open an issue first.
- Run `npm test` before you push. Add a test when you fix a bug in `server/`.
- For visual changes, attach a before/after screenshot or GIF.
- Never commit `.env` or any API key.

## Code of conduct

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
