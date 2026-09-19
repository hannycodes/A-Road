# Demo video walkthrough

Suggested script — aim for 1-2 minutes for the core flow, up to 4-5 if you show everything below.

## 1. Open with the problem (15-20s)

"A nurse trained in Kenya applies to work at a hospital in Rwanda. Her diploma is genuine — but the hospital has no fast, standardized way to confirm that. That's the gap A-Road closes."

## 2. Show the Verifier Portal (40-50s)

Run `node exchange/server.js`, open `http://localhost:3000`.

- Select **"Rwanda General Hospital"** as the institution — point out the "You are checking as" banner, since this is what makes the audit log meaningful.
- Credential type: **Diploma**, Country: **Kenya**, Reference: `KEN-DIP-1001`.
- Click **Send Verification Request**. Point out the trust-chain steps that appear: routed → signed → signature verified (Ed25519) → logged.
- Try `KEN-DIP-1002` (revoked) to show a clean "no" answer, just as fast as the "yes."

## 3. Show domestic verification (15-20s)

Switch institution to **"Kenya Ministry of Health"**, country **Kenya**, reference `KEN-CIV-3001`. Say explicitly: "Same protocol, same exchange layer — this time both sides are Kenya. A-Road doesn't distinguish domestic from cross-border."

## 4. Show the Citizen App (25-30s)

Switch tabs. Generate a shareable link for `RWA-CIV-6001`. Click "Open it (simulate recipient)." Say: "Instead of a stranger typing in a reference number, the record holder controls exactly what gets shared."

## 5. Show the USSD-style flow (20-25s)

Switch to the USSD tab. Walk through the numbered menu. Say: "Same exchange layer — a different access channel, for anyone without a smartphone or data connection."

## 6. Show the audit log (15s)

Switch to the Audit Log tab. Point out every check just run, with the requesting institution's name and a timestamp.

## 7. Close (15-20s)

"Onboarding a new country means adding one adapter — not rebuilding the system. That's the whole point: sovereignty preserved, verification shared."

## Optional: prove it's not simulated crypto

If there's time, run the tamper-detection command from the README live in a terminal — showing a genuine signature check fail on a tampered record is strong, concrete evidence this isn't just a UI mockup.

## Optional: show the code briefly

A quick side-by-side of `registries/kenya/adapter.js` and `registries/rwanda/adapter.js` — two genuinely different data formats, mapped to the exact same shared schema — is strong evidence for the "AI Coding Usage" and "Uniqueness" judging criteria.
