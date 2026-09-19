// protocol/sign.js
//
// ASYMMETRIC signing (Ed25519), via Node's built-in crypto module.
// No external dependencies.
//
// Why asymmetric and not a shared secret (HMAC)?
// With a shared secret, both sides know the same password — which means
// whoever runs the exchange layer could theoretically forge a "valid"
// answer on a country's behalf. That defeats the actual trust claim.
//
// With Ed25519, each country generates a KEY PAIR:
//   - a PRIVATE key it never shares with anyone, used only to sign
//   - a PUBLIC key it can hand out freely, used only to check a signature
// Knowing the public key lets you verify a signature is genuine —
// it does NOT let you create a new one. That asymmetry is the whole
// point: the exchange layer only ever holds public keys, so even a
// fully compromised exchange layer cannot forge a country's answer.

const crypto = require("crypto");

function canonicalize(record) {
  // Stable key order so the same record always signs identically.
  const { signature, ...rest } = record;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

// Generates a fresh Ed25519 key pair. Each country runs this ONCE
// (see registries/*/keys.js) and keeps the private key to itself.
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}

function sign(record, privateKeyPem) {
  const payload = Buffer.from(canonicalize(record));
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  // Ed25519 signs the raw message directly — no separate hash algorithm
  // to choose, which is one reason it's considered simple to use safely.
  const signature = crypto.sign(null, payload, privateKey);
  return signature.toString("base64");
}

function verify(record, publicKeyPem) {
  if (!record.signature) return false;
  try {
    const payload = Buffer.from(canonicalize(record));
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const signature = Buffer.from(record.signature, "base64");
    return crypto.verify(null, payload, publicKey, signature);
  } catch {
    return false; // malformed signature/key -> treat as not verified
  }
}

module.exports = { generateKeyPair, sign, verify };
