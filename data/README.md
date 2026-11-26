# Showdown catalogue snapshot

`showdown-catalog.json` is a versioned, committed snapshot of the catalogue
exported from the exact `pokemon-showdown` dependency pinned in the root
`package.json`.

It stores reference/catalogue fields used by the game's UI and audit planner:
species, moves, abilities, items, and their catalogue metadata.

It is **not** the battle engine. Actual turn resolution, damage, move callbacks,
abilities, held-item effects, status, and Terastallization are executed by the
server-side `pokemon-showdown` package in `server/gen9-engine.js`.

Regenerate the snapshot after changing the pinned Showdown version:

```sh
npm install
npm run data:export
```

The GitHub Actions workflow `Refresh Showdown catalogue` also regenerates and
commits the snapshot automatically when its source files change.
