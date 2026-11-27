"use strict";

const path = require("node:path");
const fs = require("node:fs");
const {gzipSync} = require("node:zlib");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const entry = path.join(root, "js", "gen9-local-engine.worker.entry.js");
const output = path.join(root, "js", "gen9-local-engine.worker.js");

async function main() {
  const result = await esbuild.build({
    entryPoints:[entry],
    outfile:output,
    bundle:true,
    platform:"browser",
    format:"iife",
    target:["es2020"],
    minify:true,
    legalComments:"eof",
    sourcemap:false,
    metafile:true,
    logLevel:"info"
  });
  const bundle = fs.readFileSync(output);
  const compressed = gzipSync(bundle, {level:9});
  fs.writeFileSync(output + ".gz", compressed);
  console.log("[gen9-browser] Worker bundle ready:", {
    bytes:bundle.length,
    gzipBytes:compressed.length,
    inputs:Object.keys(result.metafile.inputs).length
  });
}

main().catch(error => {
  console.error("[gen9-browser] Worker build failed:", error?.stack || error);
  process.exitCode = 1;
});
