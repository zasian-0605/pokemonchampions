"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { makeCatalog } = require("../server/gen9-engine");
const rootPackage = require("../package.json");

const dependency = rootPackage.dependencies?.["pokemon-showdown"];
if (!dependency || dependency.startsWith("^") || dependency.startsWith("~")) {
  throw new Error("pokemon-showdown must be pinned to an exact version in package.json");
}

const catalog = makeCatalog();
catalog.schemaVersion = 1;
catalog.sourceVersion = "pokemon-showdown@" + dependency;
catalog.generatedAt = new Date().toISOString();

for (const key of ["moves", "abilities", "items", "species"]) {
  if (!Array.isArray(catalog[key]) || catalog.counts[key] !== catalog[key].length) {
    throw new Error("Generated Showdown catalogue failed validation: " + key);
  }
}

const outputPath = path.join(__dirname, "..", "data", "showdown-catalog.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(catalog), "utf8");

console.log("[catalog-export] wrote " + outputPath);
console.log("[catalog-export] " + JSON.stringify({
  sourceVersion: catalog.sourceVersion,
  generatedAt: catalog.generatedAt,
  counts: catalog.counts
}));
