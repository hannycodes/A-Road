# A-Road

**Africa's continental trust layer for verifiable civic records.**

A-Road is a proof-of-concept protocol, inspired by Estonia's X-Road, that lets one African country's institutions verify records issued by another — without a shared central database, and without any country handing over its raw data to anyone.

> **A for Africa. Road, after X-Road.** Same idea Estonia used to connect its own ministries, adapted for a continent where the harder problem is connecting *sovereign* systems, not just internal ones.

Built for the **"Information You Can Trust" capstone hackathon** — Track: **Transparency & Accountability** (cross-track: Stability & Social Cohesion, Safety & Reporting).

## The problem

Every African country runs its own disconnected civil registries, education systems, and business registries. When a person's life crosses a border — a migrant worker, a student, a trader operating under AfCFTA, a refugee whose paperwork was lost — the information about who they are doesn't travel with them. It has to be re-proven from scratch, or it simply can't be verified at all.

A-Road doesn't try to build one continental database (no country would agree to that, and it shouldn't). Instead it standardizes the *question and the answer*: "is this record real?" → a signed, timestamped yes/no from the country that issued it.

## How it works

```
Verifier (web form / USSD)
        │
        ▼
  Exchange Layer  ──────►  Country Adapter (Meridia)  ──────►  Meridia's own database
  (routes, logs,            translates Meridia's format
   checks signatures)       into the shared schema, signs
        │                   the response with Meridia's key
        ▼
  Exchange Layer  ──────►  Country Adapter (Kessa)     ──────►  Kessa's own database
                            (different internal format,
                             same shared schema out)
```

- **Sovereignty layer** — each country keeps its own database in its own format. `registries/meridia/` and `registries/kessa/` in this demo deliberately use *different* internal formats (different field names, nested vs. flat, different date formats) to prove the adapter pattern actually absorbs that difference.
- **Exchange layer** (`exchange/server.js`) — routes a query to the right country's adapter, verifies the adapter's signature, and logs every exchange. It has zero knowledge of what a diploma or a business registration actually is — it only ever sees the shared schema.
- **Access layer** (`client/`) — a plain web form, plus a mocked USSD-style flow showing what the same query looks like on a basic phone with no data connection.

One shared protocol verifies **three different credential types** in this demo — diplomas, business registrations, and civil-status records — proving the "the exchange layer doesn't care what kind of record it's confirming" claim, rather than just asserting it.

**Meridia** and **Kessa** are fictional demo countries — this is a proof of concept, not a claim about any real government's data.

## Running it

Requires only Node.js (no dependencies, no build step).

```bash
node exchange/server.js
```

Then open **http://localhost:3000** in a browser.

Try these record references (see `registries/*/data.json` for the full list):

| Reference | Country | Type | Status |
|---|---|---|---|
| `MER-DIP-1001` | Meridia | Diploma | valid |
| `MER-DIP-1002` | Meridia | Diploma | revoked |
| `MER-BIZ-2002` | Meridia | Business registration | expired |
| `KES-DIP-4001` | Kessa | Diploma | valid |
| `KES-BIZ-5002` | Kessa | Business registration | revoked |
| `KES-CIV-6001` | Kessa | Civil status | valid |

Try a reference that doesn't exist (e.g. `MER-DIP-9999`) to see the "could not verify" path.

Check the **Audit Log** tab (or `GET /api/audit`) to see every verification logged with a timestamp — the trust/traceability guarantee made visible.

## Project structure

```
protocol/       shared schema + signing helper — the entire interoperability contract
registries/     one folder per country: its own data format + its adapter
exchange/       the generic router — country-agnostic, credential-type-agnostic
client/         web form + mocked USSD flow + audit log viewer
audit/          append-only log written by the exchange layer at runtime
demo/           walkthrough script used for the demo video
```

## Adding a country (why this scales)

Onboarding a new country means adding one folder under `registries/` (its own data + one `adapter.js` implementing `verify(credentialType, recordId)`) and one line in `exchange/server.js`'s `ADAPTERS` map. Nothing else in the system changes — that's the scalability claim made concrete.

## Trust and information sources

A-Road never stores or republishes underlying records. Every verification is a live, signed confirmation relayed from the issuing country's own adapter, so the answer always reflects that registry's current status — not a stale copy. Every response carries a `lastConfirmed` timestamp, and every exchange is logged (who asked, what, when), which protects the record holder from silent lookups as much as it protects the verifier from fraud.

## Approach to trust and accuracy (for the written summary)

- **Signed, not just returned**: each country adapter signs its own responses (HMAC for this demo; a real deployment would use asymmetric signatures per institution). The exchange layer independently re-verifies the signature before relaying an answer.
- **No shared database**: the exchange layer only ever holds a routing table (`ADAPTERS`) and an audit log — never the underlying records.
- **Minimal disclosure**: a verification response contains only what's needed to confirm the record (holder name, issuer, status, dates) — not a full copy of whatever else the issuing registry holds.
- **Traceable by construction**: the `lastConfirmed` timestamp and audit log entry exist for every single check, not as an optional feature.

## How AI coding tools were used

- Scaffolding the exchange protocol, the shared schema, and the HMAC signing/verification logic
- Building the country-adapter pattern, including deliberately mismatched mock data formats to prove the translation layer works
- Generating the client (web form + mocked USSD flow) and the audit-log viewer
- Drafting this README and the demo walkthrough

## License

MIT (or update to your preference before submitting).
