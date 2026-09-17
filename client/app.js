// client/app.js

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ["web", "ussd", "audit"].forEach((name) => {
      document.getElementById(`tab-${name}`).style.display = name === btn.dataset.tab ? "block" : "none";
    });
    if (btn.dataset.tab === "audit") loadAudit();
  });
});

// ---- Web form verification ----
async function doVerify() {
  const credentialType = document.getElementById("credentialType").value;
  const country = document.getElementById("country").value;
  const recordId = document.getElementById("recordId").value.trim();
  const requestedBy = document.getElementById("requestedBy").value.trim();
  const resultEl = document.getElementById("result");

  if (!recordId) {
    resultEl.className = "result fail";
    resultEl.textContent = "Enter a record reference to verify.";
    return;
  }

  resultEl.className = "result pending";
  resultEl.textContent = "Querying the issuing country's adapter...";

  try {
    const params = new URLSearchParams({ credentialType, country, recordId, requestedBy });
    const res = await fetch(`/api/verify?${params.toString()}`);
    const data = await res.json();

    if (!data.ok) {
      resultEl.className = "result fail";
      resultEl.textContent = `Error: ${data.error}`;
      return;
    }
    if (!data.found) {
      resultEl.className = "result fail";
      resultEl.textContent = `❌ ${data.message}`;
      return;
    }
    if (!data.signatureValid) {
      resultEl.className = "result fail";
      resultEl.textContent = `⚠️ ${data.message}`;
      return;
    }

    const r = data.record;
    const icon = r.status === "valid" ? "✅" : r.status === "revoked" ? "❌" : "⚠️";
    resultEl.className = "result ok";
    resultEl.textContent =
      `${icon} Status: ${r.status.toUpperCase()}\n` +
      `Holder: ${r.holderName} (${r.holderIdentifier})\n` +
      `Issued by: ${r.issuingInstitution}, ${r.issuingCountry}\n` +
      `Issue date: ${r.issueDate}\n` +
      `Last confirmed: ${r.lastConfirmed}\n` +
      `Signature verified: yes`;
  } catch (err) {
    resultEl.className = "result fail";
    resultEl.textContent = `Could not reach the exchange layer: ${err.message}`;
  }
}

// ---- Mocked USSD flow ----
// This is a scripted state machine for the demo video, not a real telecom
// integration — it shows what the interaction would feel like on a basic
// phone, hitting the same /api/verify endpoint under the hood.
let ussdState = { step: "menu", credentialType: null, country: null };

const ussdScreen = () => document.getElementById("ussdScreen");
const ussdInput = () => document.getElementById("ussdInput");

function ussdPrint(text) {
  ussdScreen().textContent = text;
}

async function ussdSend() {
  const reply = ussdInput().value.trim();
  ussdInput().value = "";

  if (ussdState.step === "menu") {
    const map = { "1": "diploma", "2": "business_registration", "3": "civil_status" };
    const type = map[reply];
    if (!type) return ussdPrint("Invalid option. Reply 1, 2, or 3.");
    ussdState.credentialType = type;
    ussdState.step = "country";
    return ussdPrint(`A-Road Verify\n\nSelect issuing country:\n1. Meridia\n2. Kessa`);
  }

  if (ussdState.step === "country") {
    const map = { "1": "MER", "2": "KES" };
    const country = map[reply];
    if (!country) return ussdPrint("Invalid option. Reply 1 or 2.");
    ussdState.country = country;
    ussdState.step = "record";
    return ussdPrint(`A-Road Verify\n\nEnter the record reference\n(e.g. ${country}-DIP-1001):`);
  }

  if (ussdState.step === "record") {
    ussdPrint("Checking...");
    try {
      const params = new URLSearchParams({
        credentialType: ussdState.credentialType,
        country: ussdState.country,
        recordId: reply,
        requestedBy: "ussd-demo-user",
      });
      const res = await fetch(`/api/verify?${params.toString()}`);
      const data = await res.json();

      let text;
      if (!data.found) {
        text = `RESULT: NOT FOUND\n\nCould not verify this record.\n\nReply 0 to check another.`;
      } else if (!data.signatureValid) {
        text = `RESULT: UNTRUSTED\n\nSignature could not be verified.\n\nReply 0 to check another.`;
      } else {
        const r = data.record;
        text =
          `RESULT: ${r.status.toUpperCase()}\n\n` +
          `Holder: ${r.holderName}\n` +
          `Issuer: ${r.issuingInstitution}\n` +
          `Confirmed: ${r.lastConfirmed.slice(0, 16).replace("T", " ")}\n\n` +
          `Reply 0 to check another.`;
      }
      ussdPrint(text);
      ussdState.step = "restart";
    } catch (err) {
      ussdPrint(`Could not reach A-Road. Try again shortly.\n\nReply 0 to restart.`);
      ussdState.step = "restart";
    }
    return;
  }

  if (ussdState.step === "restart") {
    ussdState = { step: "menu", credentialType: null, country: null };
    return ussdPrint("*384*77# — A-Road Verify\n1. Diploma\n2. Business Registration\n3. Civil Status\n\nReply with a number.");
  }
}

// ---- Audit log ----
async function loadAudit() {
  const body = document.getElementById("auditBody");
  body.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const res = await fetch(`/api/audit`);
    const data = await res.json();
    if (!data.entries.length) {
      body.innerHTML = `<tr><td colspan="6">No verifications logged yet — try the Web Form or USSD tab first.</td></tr>`;
      return;
    }
    body.innerHTML = data.entries
      .slice()
      .reverse()
      .map(
        (e) =>
          `<tr><td>${e.timestamp.slice(0, 19).replace("T", " ")}</td><td>${e.country}</td><td>${e.credentialType}</td><td>${e.recordId}</td><td>${e.requestedBy}</td><td>${e.result}</td></tr>`
      )
      .join("");
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6">Could not load audit log: ${err.message}</td></tr>`;
  }
}
