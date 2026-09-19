// registries/rwanda/keys.js
//
// Rwanda's own key pair. In a real deployment this would live on
// Rwanda's own infrastructure, generated and held by them — never
// checked into any shared repository. For this demo it's generated
// locally on first run and cached in keys.local.json (gitignored),
// so you get a fresh, real key pair rather than a hardcoded fake one.
//
// Only Rwanda's adapter (adapter.js) ever imports this file directly.
// Everything else in the system — the exchange layer, other
// countries, the client apps — only ever sees the PUBLIC key,
// exported from adapter.js, never this module.

const fs = require("fs");
const path = require("path");
const { generateKeyPair } = require("../../protocol/sign.js");

const KEY_FILE = path.join(__dirname, "keys.local.json");

function loadOrCreateKeys() {
  if (fs.existsSync(KEY_FILE)) {
    return JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
  }
  const pair = generateKeyPair();
  fs.writeFileSync(KEY_FILE, JSON.stringify(pair, null, 2));
  console.log("[Rwanda] Generated a new Ed25519 key pair (demo only) -> registries/rwanda/keys.local.json");
  return pair;
}

module.exports = loadOrCreateKeys();
