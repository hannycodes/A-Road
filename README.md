# A-Road

**Verify, don't centralize.**

A-Road is a proof-of-concept trust layer, inspired by Estonia's X-Road, that lets institutions in one African country confirm a record issued by another — without a shared database, and without any country handing over its data.

> ⚠️ **This is a hackathon Proof of Concept.** All country data ("Kenya" and "Rwanda") is clearly labeled **Demo / Mock National Registry** — fictional sample data, not a real government integration. See "PoC vs. Production" below for what's real and what's simplified.

Built for the **"Information You Can Trust" hackathon (OSF × Andela)** — Track: **Transparency & Accountability**.

## The scenario

A nurse trained in Kenya applies to work at a hospital in Rwanda. Her diploma is genuine — but the hospital has no fast, standardized way to confirm that. A-Road gives Rwanda's hospital a way to ask Kenya's nursing authority directly: *"is this real?"* — and get back a cryptographically signed, timestamped answer, without ever seeing Kenya's underlying database.

The same protocol also handles a **domestic** check (e.g. a Kenyan hospital verifying a record issued by Kenya's own civil registry) — one mechanism, works in both directions.

## Repository structure — the "app" vs. the "website"

This repo contains two different things people asked about — kept deliberately separate:

```
protocol/       the shared contract: schema + Ed25519 signing helpers
registries/     Kenya's and Rwanda's mock data + their adapters (+ auto-generated keys)
exchange/       the server — routes queries, verifies signatures, writes the audit log
client/         THE APP — Verifier Portal + Citizen App + USSD mock (needs the server running)
website/        THE WEBSITE — standalone marketing/showcase page with an embedded live demo
                (runs entirely in the browser, no server needed — just open the file)
docs/           architecture write-up
demo/           video walkthrough script
```

**`client/` needs `exchange/server.js` running** — it's the real app, talking to the real backend.
**`website/index.html` needs nothing** — it's a self-contained page for showing people the idea, with the same demo data reimplemented in plain JavaScript so it works with zero setup.

## Running it — step by step

Requires only **Node.js** (v16+). Zero npm dependencies — nothing to `npm install`.

1. Open a terminal in this folder (the one with `exchange/`, `client/`, etc. directly inside it).
2. Run:
   ```bash
   node exchange/server.js
   ```
3. You should see:
   ```
   [Kenya] Generated a new Ed25519 key pair (demo only) -> registries/kenya/keys.local.json
   [Rwanda] Generated a new Ed25519 key pair (demo only) -> registries/rwanda/keys.local.json
   A-Road exchange layer running at http://localhost:3000
   Registered countries: Kenya (KEN), Rwanda (RWA)
   ```
   (The key pairs are generated fresh on first run and cached locally — they're gitignored, so each person running this gets their own real keys, not a shared hardcoded one.)
4. Open **http://localhost:3000** in a browser. This is the **app** — Verifier Portal, Citizen App, USSD mock, Audit Log.
5. Try it:
   - **Verifier Portal**: pick "Rwanda General Hospital" as the institution, Diploma, Kenya, and reference `KEN-DIP-1001` → should return a green ✅ VALID result with the trust-chain steps shown.
   - Try `KEN-DIP-1002` → revoked. Try a made-up reference → not found.
   - **Citizen App**: generate a shareable link for `RWA-CIV-6001`, then click "Open it (simulate recipient)" to see the limited-disclosure view.
   - **Audit Log**: refresh to see every check you just ran, timestamped.
6. To view the **website** (the separate showcase/marketing page), just open `website/index.html` directly in a browser — no server needed for this one.
7. Press `Ctrl+C` in the terminal to stop the server.

## Verifying the trust mechanism actually works (not just simulated)

```bash
node -e "
const adapter = require('./registries/kenya/adapter.js');
const { verify } = require('./protocol/sign.js');
const rec = adapter.verify('diploma','KEN-DIP-1001');
console.log('Signature valid:', verify(rec, adapter.publicKey));
const tampered = { ...rec, status: 'valid', holderName: 'Someone Else' };
console.log('Tampered record still valid?', verify(tampered, adapter.publicKey));
"
```
Expected output: `Signature valid: true` and `Tampered record still valid? false` — proving the signature genuinely detects tampering, not just checking a flag.

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Exchange layer + adapters | **Node.js, zero dependencies** | Nothing to install, every line readable, no framework obscuring the logic being judged |
| Signing | **Ed25519** (Node's built-in `crypto`) | Modern, fast, simple-to-use-correctly asymmetric signatures — real cryptographic proof, not a simulated placeholder |
| Client (app) + Website | **Plain HTML/CSS/JS, no build step** | Opens instantly, easy for a judge to read every line, no tooling required |
| Data storage (demo) | **JSON files** per country | Stands in for "each country's own database" — real deployment would be whatever system that country already runs |
| Key storage | **Locally generated, gitignored** `keys.local.json` per country | Models good key hygiene — private keys are never committed to source control, even in a demo |

## Reference records to try

| Reference | Country | Type | Status |
|---|---|---|---|
| `KEN-DIP-1001` | Kenya | Diploma (the nurse) | valid |
| `KEN-DIP-1002` | Kenya | Diploma | revoked |
| `KEN-BIZ-2002` | Kenya | Business registration | expired |
| `KEN-HLT-7001` | Kenya | Health record | valid |
| `RWA-DIP-4001` | Rwanda | Diploma | valid |
| `RWA-BIZ-5002` | Rwanda | Business registration | revoked |
| `RWA-CIV-6001` | Rwanda | Civil status | valid |
| `RWA-HLT-7001` | Rwanda | Health record | valid |

## The trust model

- **Digital signatures (Ed25519)** — each country signs its own answers with a private key only it holds. The exchange layer verifies using only the public key, so it can check an answer but never forge one.
- **Verification timestamps** — every response states exactly when it was checked, so nobody unknowingly relies on stale information.
- **Audit logs** — every verification is logged (who asked, what, when, result) for accountability, without exposing more personal data than necessary.

## PoC vs. Production — being honest about the gap

**What this PoC demonstrates (real, not simulated):**
- Real Ed25519 key generation and signature verification
- Real tamper detection (see the verification command above)
- A real, working adapter pattern across two genuinely different data formats
- A real audit trail of every verification

**What production infrastructure would require, and doesn't have here:**
- Real institution authentication (right now, the "institution" selector is a fixed demo list, not a login system)
- Rate limiting, to stop someone from fishing through every possible reference number
- Key rotation and revocation
- PKI — a way to verify a public key genuinely belongs to the claimed authority (a governance problem as much as a technical one)
- Real government data-sharing agreements — A-Road proves a record is *authentic*; it does not make one country *legally recognize* another's qualification. That requires actual policy agreements between professional bodies, outside this PoC's scope.

## Adding a country (why this scales)

Onboard a new country by adding one folder under `registries/` (its own data + `keys.js` + `adapter.js` implementing `verify(credentialType, recordId)`) and one line in `exchange/server.js`'s `ADAPTERS` map. Nothing else changes — the exchange layer, the client, and the website never need to know a new country exists beyond that one line.

## How AI coding tools were used

- Scaffolding the exchange protocol, the shared schema, and the Ed25519 signing/verification logic
- Building the country-adapter pattern, including deliberately mismatched mock data formats to prove the translation layer works
- Security review of the signing scheme (identifying and fixing the original shared-secret/HMAC weakness in favor of asymmetric signatures)
- Building the client app, the standalone website, and this documentation

## License

MIT (or update to your preference before submitting).
