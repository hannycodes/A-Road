# A-Road — System Architecture & Build Plan

## 1. The four products, and what each one actually is

The brief asks for a GitHub repo, a demo video, a pitch deck, and a written summary. To make those land well, we're building four *things*, but it's important to be precise about what each one really is — two are genuinely separate surfaces, and two are really the same underlying app viewed two ways:

| # | What you called it | What it actually is |
|---|---|---|
| 1 | "An app for users/citizens" | The **verifier/citizen web app** — works for both a citizen sharing proof of their own record *and* an employer/clinic/agency checking someone else's. One responsive web app, two modes. Not a native mobile app (out of scope for the timeline) — a mobile-friendly website works on any phone, which is more accessible anyway. |
| 2 | "A website showcasing our things and services" | The **public marketing/showcase site** — problem, solution, track, team, links to the repo/deck/video. |
| 3 | "A working demo" | The showcase site **embeds a live, working version of the verification flow** directly in the browser — no install, no local server, a real clickable link you can send anyone, including judges. |
| 4 | "All verification things" | The actual protocol + country adapters — this already exists and works in the GitHub repo. |

Item 3 is the important design decision: rather than making people clone your repo and run `node exchange/server.js` to see it work, I'm building a **second, self-contained version of the same verification logic that runs entirely in the browser** and gets published to a real link. Same protocol concept, same schema, same demo data — just packaged so it works with zero setup. The GitHub repo stays the "real" architecture for code-quality judging; the published site is what you actually hand a judge, a teammate, or a recruiter to click.

## 2. System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC-FACING LAYER                       │
│                                                                    │
│   ┌──────────────────────┐      ┌──────────────────────────┐   │
│   │   Showcase Website     │      │  Citizen / Verifier App   │   │
│   │   (marketing + demo)   │◄────►│  (verify / share records) │   │
│   └──────────────────────┘      └──────────────────────────┘   │
│              │                              │                    │
└──────────────┼──────────────────────────────┼────────────────────┘
               │                              │
               ▼                              ▼
      ┌─────────────────────────────────────────────┐
      │           EXCHANGE LAYER (the protocol)        │
      │   routes queries · verifies signatures         │
      │   writes the audit log · knows nothing about    │
      │   any specific country or credential type       │
      └─────────────────────────────────────────────┘
               │              │              │
               ▼              ▼              ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐        ...one per
      │ Country   │   │ Country   │   │ Country   │        participating
      │ Adapter   │   │ Adapter   │   │ Adapter   │        country
      │ (Kenya)   │   │ (Rwanda)  │   │ (Ghana)   │
      └──────────┘   └──────────┘   └──────────┘
               │              │              │
               ▼              ▼              ▼
        that country's   that country's   that country's
        own database      own database      own database
        (never shared,    (never shared,    (never shared,
        never leaves      never leaves      never leaves
        the country)      the country)      the country)


      ┌─────────────────────────────────────────────┐
      │   FUTURE: SMS / USSD GATEWAY (roadmap, not    │
      │   built this round — see Section 6)            │
      └─────────────────────────────────────────────┘
```

**The one rule that makes this scale:** nothing above the "Exchange Layer" line, and nothing in the Exchange Layer itself, knows anything about a specific country. Every country-specific detail lives inside that country's own adapter. Adding country #21 means writing one adapter file — it never touches the app, the website, or the protocol.

## 3. Component breakdown

### 3.1 Exchange Layer (protocol) — *already built*
- Node.js, zero dependencies, in `exchange/server.js`
- Routes `(country, credentialType, recordId)` → the right adapter
- Independently re-verifies every adapter's signature before relaying an answer
- Writes every check to an append-only audit log

### 3.2 Country Adapters — *already built for 2, designed to scale to all AU members*
- One folder per country: its own raw data format + one `adapter.js` implementing a single function, `verify(credentialType, recordId)`
- **Built and working now:** Kenya (KEN), Rwanda (RWA) — clearly labeled **Demo / Mock National Registry** data, each with a deliberately different internal format, to prove the translation pattern actually works and isn't hand-waved. Not connected to any real government system.
- **Designed to add easily:** every African Union member state can plug in the same way. For the competition specifically, worth prioritizing adapters that demonstrate the brief's language requirement — one Anglophone, one Francophone, one Arabic-speaking, one Portuguese-speaking country as symbolic "adapters" if there's time (e.g. representative of Nigeria/Kenya, Senegal/Côte d'Ivoire, Egypt/Morocco, Mozambique/Angola) — this proves multilingual reach without needing all 54 built

### 3.3 Citizen / Verifier App — *to be built this round*
Two modes of the same app:

**Verify mode** (already exists in the repo, gets rebuilt into this app):
- Pick credential type + issuing country + record reference → get a signed answer

**"My Records" mode** (new — this is the actually citizen-centric part):
- Instead of a stranger typing in your reference number, *you* generate a shareable verification link or QR code for your own diploma/registration/ID
- You hand that link/QR to an employer, a clinic, a border office — they open it and see the same signed, timestamped confirmation, without ever needing to know your raw reference number or any other personal detail
- This flips the flow from "institution searches for you" to "you control what gets shared, with whom, on demand" — a meaningfully better privacy story, and it's a detail judges are unlikely to see anywhere else

### 3.4 Showcase Website — *to be built this round*
- Hero section (problem statement)
- How it works (3-layer diagram, matches the pitch deck)
- **Live embedded demo** (the verifier app, working, right on the page)
- Track alignment + judging-criteria fit
- Links out to GitHub repo, pitch deck, demo video
- Same visual identity as the deck: navy / terracotta / gold, A-Road logo mark

### 3.5 SMS / USSD Gateway — *architecture only, not built this round (see Section 6)*

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Exchange layer + adapters | **Node.js, no framework, zero npm dependencies** | Already built this way; a judge can read every line without knowing a framework; nothing to install |
| Citizen/Verifier app + Showcase website | **Plain HTML/CSS/JS** (no React/build step) | Same reasoning — opens instantly, no build tooling, easy for anyone to inspect |
| Signing | **Ed25519 asymmetric signatures** (Node's built-in `crypto`, no dependencies) | Each country holds its own private key and shares only its public key — the exchange layer can verify but never forge a signature. This is real, not simulated; production would add proper key rotation and PKI (verifying a public key genuinely belongs to the claimed authority) |
| Data storage (demo) | **JSON files** per country | Stands in for "each country's own database" — in reality this would be whatever system that country already runs; A-Road never mandates a specific database |
| Live published demo | **Self-contained HTML/JS**, verification logic re-implemented client-side with the same demo data | Runs with zero setup for anyone who clicks the link — no server to keep alive |
| QR codes for "My Records" mode | **A small client-side QR library** | Lets a citizen generate a scannable verification link on the spot |
| SMS/USSD (roadmap) | **Africa's Talking API** (sandbox) | Africa-focused telecom aggregator, supports USSD + SMS across many African carriers with a free sandbox — the natural choice over Twilio for this use case |

## 5. What "including every African country" means in practice

Being direct about this: a working, tested adapter for all 54 AU member states is not a one-week hackathon deliverable, and claiming it would hurt credibility more than help it if a judge asks a follow-up question. What *is* achievable and honest:

1. **The architecture demonstrably scales** — this document and the repo structure prove it: adding a country is one file, not a rebuild.
2. **A representative set of adapters**, not all 54 — 2 are done now; if there's time before the deadline, 2-4 more (chosen for language/region diversity) meaningfully strengthens the "continental" story without overreaching.
3. **The pitch deck and written summary should say exactly this** — "designed and proven to onboard any AU member state via one adapter; N countries implemented for this demo" is a stronger, more credible claim than implying full coverage.

## 6. Roadmap for SMS/USSD (next phase, not this round)

Since you said we'll come back to this: the design is already compatible with it — a real gateway just becomes another client of the same Exchange Layer, identical in principle to the web app.

1. Register a free **Africa's Talking** sandbox account
2. Define a USSD menu (`*384*77#` style, already mocked in the current client) mapped to their webhook format
3. On each user input, the webhook calls the same `/api/verify` endpoint the web app already calls
4. Format the JSON response as plain USSD/SMS text (already prototyped in `client/app.js`'s mocked flow — that code becomes the real webhook handler almost unchanged)
5. No changes needed to the Exchange Layer or adapters — this is the scalability claim working in practice, not just in theory

## 7. Build order for this round

1. Citizen/Verifier web app (verify mode + "My Records" mode with shareable link/QR)
2. Showcase website with the live embedded demo
3. Visual polish pass matching the deck's branding
4. Publish the site to a real link
