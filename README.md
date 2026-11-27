# Pokémon Champions 2D

A browser-based Pokémon collection game with a separate server-authoritative
Generation 9 battle mode.

## Project layout

- `index.html`, `css/`, `js/` — browser interface and the existing
  collection, box, training, and legacy prototype systems.
- `js/offline-data.js` — the main built-in Pokédex and Japanese game data.
- `js/upstream-mechanics.js` — supplemental reference metadata used by the
  older browser-side prototype. It does not contain executable Showdown
  battle callbacks.
- `data/showdown-catalog.json` — committed catalogue snapshot for species,
  moves, abilities, and items used by the game's reference UI.
- `js/patches/v27-gen9-battle-ui.js` — the National Dex battle screen and its
  UI bridge. It owns presentation and input; it does not calculate battle
  results.
- `js/gen9-local-engine.worker.entry.js` — browser CPU battle runtime. It
  loads the Showdown simulator, validates teams, generates the CPU team, and
  advances each turn inside a Web Worker.
- `scripts/build-browser-gen9.js` — bundles the worker with esbuild and
  creates a gzip-compressed copy for browsers that support it.
- `server/gen9-engine.js` — server-authoritative Showdown BattleStream used
  for online PvP. The server validates both teams and resolves both players'
  actions.
- `server/index.js` — the HTTP server, static worker-bundle delivery, and
  WebSocket room/matchmaking entry point.
- `server/auto-audit.js` — server-side mechanics audit job runner.
- `scripts/export-showdown-catalog.js` — rebuilds the committed catalogue
  from the pinned server-side Showdown package.

The root `package.json` is the only dependency manifest used by Render and
GitHub Actions. There is no separate server npm project. The `postinstall`
script builds the browser worker during dependency installation, before the
service is started.

## Battle architecture

The National Dex screen uses two execution paths:

- **CPU battles:** `@pkmn/sim` and `@pkmn/randoms` are bundled into a browser
  Web Worker. Team validation, random CPU team generation, move selection,
  damage calculation, abilities, held items, status, Mega Evolution, and
  Terastallization are resolved locally. CPU turns do not call
  `/api/gen9/battles`.
- **Online PvP:** the browser uses the existing `/ws` WebSocket connection
  for random matchmaking and private room codes. The server runs the battle
  authoritatively, so both players see the same result and cannot decide
  damage locally.

The CPU and online paths use the same National Dex AG ruleset identifier:
`gen9nationaldexag`. The browser simulator is a browser-compatible
extraction of Pokémon Showdown; the online server currently retains the
pinned `pokemon-showdown` package. Both paths are kept separate from the
older collection-game battle and raid prototypes.

## Battle rules

The battle format is `gen9nationaldexag`: Generation 9 battle mechanics with
National Dex rules, allowing supported species and moves from earlier
generations. Mega Evolution and Terastallization are enabled. Dynamax is not
enabled in this Generation 9 format. Showdown's `TeamValidator` checks
player teams before a match starts.

## Run locally

Use Node.js 22.18.0 or newer:

```sh
npm install
npm start
```

Open `http://localhost:10000`. The `postinstall` lifecycle creates the local
battle worker during `npm install`, so the browser bundle is ready before
`npm start`.

Run the server simulator smoke tests:

```sh
npm test
```

Regenerate the saved catalogue after changing the pinned server-side
Showdown version:

```sh
npm run data:export
```

The `Refresh Showdown catalogue` GitHub Actions workflow also regenerates
the snapshot and commits it together with `package-lock.json`.

## API and realtime connection

- `GET /health` — web service health check.
- `GET /api/gen9/health` — server battle-engine health and active format.
- `GET /api/gen9/catalog` — server-side Showdown catalogue.
- `POST /api/gen9/battles` and related action routes — retained server
  endpoints for diagnostics and compatibility; the browser CPU screen uses
  its local worker instead.
- `/ws` — random matchmaking and private-room online PvP.

## Audit limitations

The audit job checks a large species × move × Tera × item matrix and a
separate case for each species ability. The ability-only cases use one selected
test move; this is not every ability × every move × every item × every Tera
combination. A “verified” result means the selected move appeared in the
Showdown battle log (and the requested Tera action occurred where applicable).
It does not independently prove every secondary effect or all battle contexts.

The current audit runner stores its job and at most 200 recent samples in
server memory. Restarting or redeploying the service clears the job. The audit
matrix is intentionally large and should not be treated as a quick health
check.

## License and attribution

See `SHOWDOWN-NOTICE.md` for the Pokémon Showdown MIT license notice. This is
an unofficial fan project and is not affiliated with Nintendo, The Pokémon
Company, or Game Freak.
