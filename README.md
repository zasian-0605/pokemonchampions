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
- `data/showdown-catalog.json` — committed, versioned catalogue snapshot
  containing Showdown species, move, ability, and item records.
- `server/gen9-engine.js` — server-authoritative Showdown BattleStream.
  The snapshot is used for catalogue/UI data; the installed Showdown package
  executes the actual battle mechanics.
- `server/index.js` — the single HTTP and WebSocket server entry point.
- `server/auto-audit.js` — memory-only audit job runner.
- `scripts/export-showdown-catalog.js` — rebuilds the committed catalogue
  from the exact Showdown package version pinned in the root manifest.

The root `package.json` is the only dependency manifest used by Render and
GitHub Actions. There is no separate server npm project.

## Battle rules

The current server battle format is `gen9nationaldexag`: Generation 9
mechanics with National Dex AG rules. Species from earlier generations can
appear when supported by the format. Mega Evolution and Terastallization are
enabled; Dynamax is disabled. Showdown's `TeamValidator` checks player teams.

The Generation 9 screen is separate from the older browser-side prototype
battle and raid modes. Those legacy modes still use their own existing client
logic and have not been migrated to Showdown.

## Run locally

Use Node.js 22.18.0 or newer:

```sh
npm install
npm start
```

Open `http://localhost:10000`.

Run the simulator smoke tests:

```sh
npm test
```

Regenerate the saved catalogue after changing the pinned Showdown version:

```sh
npm run data:export
```

The `Refresh Showdown catalogue` GitHub Actions workflow also regenerates the
snapshot and commits it together with `package-lock.json`.

## API

- `GET /health` — service health check.
- `GET /api/gen9/health` — battle-engine health and active format.
- `GET /api/gen9/catalog` — committed Showdown catalogue snapshot.
- `POST /api/gen9/battles` — create a CPU battle.
- `POST /api/gen9/battles/:id/action` — submit a CPU-battle action.
- `GET /api/gen9/battles/:id?token=...` — read a battle snapshot.
- `/ws` — room-code online PvP using the same Showdown battle service.
- `GET /api/audit/health` — audit scope and case count.
- `POST /api/audit/jobs` — start the audit job.
- `GET /api/audit/jobs/latest` — read the latest in-memory job.

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
