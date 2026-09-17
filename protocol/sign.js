// protocol/sign.js
//
// Minimal signing layer for the demo. Each country "owns" a secret key,
// standing in for the private key an issuing institution would hold in a
// real deployment (asymmetric signatures, HSM-backed, etc). The exchange
// layer never sees these keys directly — each adapter signs its own
// responses, which is the point: the issuing country vouches for the
// answer, not A-Road itself.

const crypto = require("crypto");

function canonicalize(record) {
  // Stable key order so the same record always signs the same way.
  const { signature, ...rest } = record;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

function sign(record, secret) {
  const payload = canonicalize(record);
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function verify(record, secret) {
  if (!record.signature) return false;
  const expected = sign(record, secret);
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(record.signature, "hex")
  );
}

module.exports = { sign, verify };
