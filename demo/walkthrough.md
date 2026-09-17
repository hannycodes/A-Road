# Demo video walkthrough

A suggested script — aim for 3-5 minutes. Adjust pacing to fit your actual demo timing.

## 1. Open with the problem (20-30s)

State it plainly: "Every African country has its own disconnected civil registries, education systems, and business registries. When someone's life crosses a border, their records don't cross with them." No need to show anything on screen yet — this is voice-over or title cards.

## 2. Introduce A-Road (15-20s)

"A-Road is a shared verification protocol — inspired by Estonia's X-Road — that lets institutions in one African country confirm a record issued by another, without a central database and without either country handing over its data."

## 3. Show the running app (60-90s)

Run `node exchange/server.js`, open `http://localhost:3000`.

- Verify a **valid** Meridia diploma (`MER-DIP-1001`) — point out the signed response, the issuing institution, and the `lastConfirmed` timestamp.
- Verify a **revoked** Kessa business registration (`KES-BIZ-5002`) — show that a "no" answer is just as clean as a "yes."
- Switch credential type to **civil status**, verify a Kessa record (`KES-CIV-6001`) — this is the moment that proves the "one protocol, three record types" claim, so linger on it for a beat.

## 4. Show the USSD-style flow (30-40s)

Switch to the USSD tab. Walk through the numbered menu → country → record reference flow, and verify the same or a different record. Say explicitly: "This is the same exchange layer — just a different access channel, for anyone without a smartphone or data connection."

## 5. Show the audit log (20-30s)

Switch to the Audit Log tab. Point out that every check you just ran is there, timestamped, with what was checked and the result — "this is the trust and traceability requirement made visible, not just promised."

## 6. Close on scalability (15-20s)

"Onboarding a new country means adding one adapter — not rebuilding the system. That's the whole point: sovereignty preserved, verification shared."

## Optional: show the code briefly

If there's time, a quick screen-share of `registries/meridia/adapter.js` next to `registries/kessa/adapter.js` is a strong visual — two genuinely different data formats, mapped to the exact same shared schema. This is the clearest evidence of real engineering work for the "AI Coding Usage" judging criterion.
