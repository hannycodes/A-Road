// exchange/server.js
//
// The exchange layer. It knows nothing about diplomas, health
// records, Kenya, or Rwanda specifically — it only knows how to
// route a (country, credentialType, recordId) query to the right
// adapter, verify the adapter's signature using that country's
// PUBLIC key, and log the exchange. Adding a country means adding
// one adapter to the registry below — nothing here changes.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { verify: verifySignature } = require("../protocol/sign.js");

const kenya = require("../registries/kenya/adapter.js");
const rwanda = require("../registries/rwanda/adapter.js");

// --- The only place a new country gets "plugged in" ---
// Note: only each adapter's PUBLIC key is used here. The exchange
// layer never has access to any country's private key.
const ADAPTERS = {
  KEN: kenya,
  RWA: rwanda,
};

const AUDIT_LOG_PATH = path.join(__dirname, "..", "audit", "log.json");
const CLIENT_DIR = path.join(__dirname, "..", "client");
const PORT = process.env.PORT || 3000;

function readAuditLog() {
  try {
    return JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, "utf8"));
  } catch {
    return [];
  }
}

function appendAuditEntry(entry) {
  const log = readAuditLog();
  log.push(entry);
  fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(log, null, 2));
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
}

// Simulated institution list for the demo's "who is asking" selector.
// In production this would come from a real institution-registration
// and authentication system (see docs/architecture.md) — here it's
// just a fixed list so the audit log and UI can show a real name
// instead of an anonymous request.
const KNOWN_INSTITUTIONS = [
  { id: "rwa-general-hospital", name: "Rwanda General Hospital", country: "RWA" },
  { id: "ken-ministry-of-health", name: "Kenya Ministry of Health", country: "KEN" },
  { id: "ken-business-partner", name: "A Kenyan Trade Partner", country: "KEN" },
  { id: "citizen", name: "Citizen (self-check / shared link)", country: null },
];

function handleInstitutions(req, res) {
  return sendJson(res, 200, { ok: true, institutions: KNOWN_INSTITUTIONS });
}

function handleVerify(req, res, query) {
  const { country, credentialType, recordId, requestingInstitution } = query;
  const timestamp = new Date().toISOString();
  const institution = KNOWN_INSTITUTIONS.find((i) => i.id === requestingInstitution)?.name || requestingInstitution || "unspecified";

  const adapter = ADAPTERS[country];
  if (!adapter) {
    appendAuditEntry({ timestamp, country, credentialType, recordId, requestingInstitution: institution, result: "unknown_country" });
    return sendJson(res, 400, { ok: false, error: `No adapter registered for country "${country}"` });
  }

  const record = adapter.verify(credentialType, recordId);

  if (!record) {
    appendAuditEntry({ timestamp, country, credentialType, recordId, requestingInstitution: institution, result: "not_found" });
    return sendJson(res, 200, { ok: true, found: false, message: "Could not verify \u2014 no matching record from the issuing country." });
  }

  // The exchange layer independently re-checks the adapter's signature
  // using ONLY that country's public key before relaying the answer.
  // This is what "traceable and tamper-evident" means in practice.
  const signatureValid = verifySignature(record, adapter.publicKey);

  appendAuditEntry({
    timestamp,
    country,
    credentialType,
    recordId,
    requestingInstitution: institution,
    result: signatureValid ? `verified_${record.status}` : "signature_invalid",
  });

  if (!signatureValid) {
    return sendJson(res, 200, { ok: true, found: true, signatureValid: false, message: "Record returned but signature could not be verified \u2014 treat as untrusted." });
  }

  return sendJson(res, 200, { ok: true, found: true, signatureValid: true, record });
}

function handleAudit(req, res) {
  return sendJson(res, 200, { ok: true, entries: readAuditLog() });
}

function serveStatic(req, res, urlPath) {
  const filePath = urlPath === "/" ? "/index.html" : urlPath;
  const fullPath = path.join(CLIENT_DIR, filePath);
  if (!fullPath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(fullPath);
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
    res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/verify") {
    const query = Object.fromEntries(url.searchParams.entries());
    return handleVerify(req, res, query);
  }
  if (url.pathname === "/api/audit") {
    return handleAudit(req, res);
  }
  if (url.pathname === "/api/institutions") {
    return handleInstitutions(req, res);
  }
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`A-Road exchange layer running at http://localhost:${PORT}`);
  console.log(`Registered countries: ${Object.values(ADAPTERS).map(a => `${a.countryName} (${a.countryCode})`).join(", ")}`);
});
