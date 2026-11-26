# Server

This folder contains the live HTTP/WebSocket server and the Generation 9
Showdown battle service.

There is no separate npm project in this folder. Install dependencies and
start the server from the repository root:

```sh
npm install
npm start
npm test
```

Render uses the root `render.yaml` and root `package.json`.

## Main files

- `index.js` — HTTP routes, static file hosting, WebSocket rooms, and API
  error handling.
- `gen9-engine.js` — server-authoritative battle sessions using the pinned
  `pokemon-showdown` package.
- `auto-audit.js` — in-memory test matrix runner.
- `test-gen9-engine.js` — CPU battle, online battle, Tera, and catalogue
  smoke tests.

The committed `../data/showdown-catalog.json` file is catalogue data for
screens and audit planning. It does not replace the Showdown simulator code.
