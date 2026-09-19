// client/app.js

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ["verify", "mine", "ussd", "audit"].forEach((name) => {
      document.getElementById(`tab-${name}`).style.display = name === btn.dataset.tab ? "block" : "none";
    });
    if (btn.dataset.tab === "audit") loadAudit();
  });
});

// ---- Load institutions for the Verifier Portal selector ----
let INSTITUTIONS = [];
async function loadInstitutions() {
  try {
    const res = await fetch("/api/institutions");
    const data = await res.json();
    INSTITUTIONS = data.institutions;
    const select = document.getElementById("institution");
    select.innerHTML = INSTITUTIONS.map((i) => `<option value="${i.id}">${i.name}</option>`).join("");
    updateWhoBanner();
    select.addEventListener("change", updateWhoBanner);
  } catch (err) {
    document.getElementById("institution").innerHTML = `<option value="">Could not load institutions</option>`;
  }
}
function updateWhoBanner() {
  const id = document.getElementById("institution").value;
  const inst = INSTITUTIONS.find((i) => i.id === id);
  document.getElementById("whoBanner").innerHTML = inst
    ? `You are checking as: <b>${inst.name}</b>`
    : "Select an institution to see who is asking.";
}
loadInstitutions();

// ---- Verifier Portal ----
async function doVerify() {
  const institution = document.getElementById("institution").value;
  const credentialType = document.getElementById("credentialType").value;
  const country = document.getElementById("country").value;
  const recordId = document.getElementById("recordId").value.trim();
  const resultEl = document.getElementById("verifyResult");

  if (!recordId) {
    resultEl.className = "result fail";
    resultEl.textContent = "Enter a record reference to verify.";
    return;
  }

  resultEl.className = "result pending";
  resultEl.textContent = "Sending request to the issuing country's adapter...";

  try {
    const params = new URLSearchParams({ credentialType, country, recordId, requestingInstitution: institution });
    const res = await fetch(`/api/verify?${params.toString()}`);
    const data = await res.json();

    if (!data.ok) { resultEl.className = "result fail"; resultEl.textContent = `Error: ${data.error}`; return; }
    if (!data.found) { resultEl.className = "result fail"; resultEl.textContent = `❌ ${data.message}`; return; }
    if (!data.signatureValid) { resultEl.className = "result fail"; resultEl.textContent = `⚠️ ${data.message}`; return; }

    const r = data.record;
    const icon = r.status === "valid" ? "✅" : r.status === "revoked" ? "❌" : "⚠️";
    resultEl.className = "result ok";
    resultEl.innerHTML =
      `${icon} Status: ${r.status.toUpperCase()}\n` +
      `${r.credentialTitle ? "Title: " + r.credentialTitle + "\n" : ""}` +
      `Holder: ${r.holderName} (${r.holderIdentifier})\n` +
      `Issued by: ${r.issuingInstitution}, ${r.issuingCountry}\n` +
      `Issue date: ${r.issueDate}\n` +
      `Last confirmed: ${r.lastConfirmed}\n` +
      `${r.demoDisclaimer}`;
    resultEl.innerHTML += `<div class="trust-chain">
      <span class="trust-step">✓ Request routed to ${r.issuingCountry}</span>
      <span class="trust-step">✓ Signed by issuing authority</span>
      <span class="trust-step">✓ Signature verified (Ed25519)</span>
      <span class="trust-step">✓ Logged to audit trail</span>
    </div>`;
  } catch (err) {
    resultEl.className = "result fail";
    resultEl.textContent = `Could not reach the exchange layer: ${err.message}`;
  }
}

// ---- Citizen App ----
function generateLink() {
  const credentialType = document.getElementById("mineType").value;
  const country = document.getElementById("mineCountry").value;
  const recordId = document.getElementById("mineRecordId").value.trim();
  const el = document.getElementById("mineResult");
  if (!recordId) { el.className = "result fail"; el.textContent = "Enter your record reference first."; return; }
  const params = new URLSearchParams({ t: credentialType, c: country, r: recordId });
  const link = `${location.origin}${location.pathname}#verify=${params.toString()}`;
  document.getElementById("shareLink").value = link;
  document.getElementById("linkBox").style.display = "flex";
  el.className = "result ok";
  el.textContent = "Link generated. Anyone who opens it sees only the verification result — never your raw personal record.";
}
function copyLink() {
  const input = document.getElementById("shareLink");
  input.select();
  document.execCommand("copy");
}
async function openSharedLink() {
  const link = document.getElementById("shareLink").value;
  const hash = link.split("#verify=")[1];
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const el = document.getElementById("mineResult");
  try {
    const q = new URLSearchParams({ credentialType: params.get("t"), country: params.get("c"), recordId: params.get("r"), requestingInstitution: "citizen" });
    const res = await fetch(`/api/verify?${q.toString()}`);
    const data = await res.json();
    if (!data.found) { el.className = "result fail"; el.textContent = "❌ Could not verify this record."; return; }
    const r = data.record;
    const icon = r.status === "valid" ? "✅" : r.status === "revoked" ? "❌" : "⚠️";
    el.className = "result ok";
    el.textContent = `Recipient view:\n${icon} Status: ${r.status.toUpperCase()}\nIssued by: ${r.issuingInstitution}, ${r.issuingCountry}\nLast confirmed: ${r.lastConfirmed}`;
  } catch (err) {
    el.className = "result fail";
    el.textContent = `Could not reach the exchange layer: ${err.message}`;
  }
}

// ---- USSD mock ----
let ussdState = { step: "menu", credentialType: null, country: null };
function ussdPrint(t) { document.getElementById("ussdScreen").textContent = t; }
async function ussdSend() {
  const input = document.getElementById("ussdInput");
  const reply = input.value.trim();
  input.value = "";
  if (ussdState.step === "menu") {
    const map = { "1": "diploma", "2": "business_registration", "3": "civil_status", "4": "health_record" };
    const t = map[reply];
    if (!t) return ussdPrint("Invalid option. Reply 1-4.");
    ussdState.credentialType = t; ussdState.step = "country";
    return ussdPrint("A-Road Verify\n\nSelect issuing country:\n1. Kenya\n2. Rwanda");
  }
  if (ussdState.step === "country") {
    const map = { "1": "KEN", "2": "RWA" };
    const c = map[reply];
    if (!c) return ussdPrint("Invalid option. Reply 1 or 2.");
    ussdState.country = c; ussdState.step = "record";
    return ussdPrint(`A-Road Verify\n\nEnter the record reference\n(e.g. ${c}-DIP-1001):`);
  }
  if (ussdState.step === "record") {
    ussdPrint("Checking...");
    try {
      const params = new URLSearchParams({ credentialType: ussdState.credentialType, country: ussdState.country, recordId: reply, requestingInstitution: "citizen" });
      const res = await fetch(`/api/verify?${params.toString()}`);
      const data = await res.json();
      let text;
      if (!data.found) text = "RESULT: NOT FOUND\n\nReply 0 to check another.";
      else if (!data.signatureValid) text = "RESULT: UNTRUSTED\n\nSignature could not be verified.\n\nReply 0 to check another.";
      else {
        const r = data.record;
        text = `RESULT: ${r.status.toUpperCase()}\n\nHolder: ${r.holderName}\nIssuer: ${r.issuingInstitution}\nConfirmed: ${r.lastConfirmed.slice(0, 16).replace("T", " ")}\n\nReply 0 to check another.`;
      }
      ussdPrint(text);
      ussdState.step = "restart";
    } catch (err) {
      ussdPrint("Could not reach A-Road. Try again shortly.\n\nReply 0 to restart.");
      ussdState.step = "restart";
    }
    return;
  }
  if (ussdState.step === "restart") {
    ussdState = { step: "menu", credentialType: null, country: null };
    return ussdPrint("*384*77# — A-Road Verify\n1. Diploma\n2. Business Registration\n3. Civil Status\n4. Health Record\n\nReply with a number.");
  }
}

// ---- Audit log ----
async function loadAudit() {
  const body = document.getElementById("auditBody");
  body.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const res = await fetch("/api/audit");
    const data = await res.json();
    if (!data.entries.length) { body.innerHTML = `<tr><td colspan="6">No verifications logged yet.</td></tr>`; return; }
    body.innerHTML = data.entries.slice().reverse().map((e) =>
      `<tr><td>${e.timestamp.slice(0, 19).replace("T", " ")}</td><td>${e.country}</td><td>${e.credentialType}</td><td>${e.recordId}</td><td>${e.requestingInstitution}</td><td>${e.result}</td></tr>`
    ).join("");
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6">Could not load audit log: ${err.message}</td></tr>`;
  }
}

// ---- Deep link handling for shared Citizen App links ----
window.addEventListener("load", () => {
  if (location.hash.startsWith("#verify=")) {
    document.querySelector('[data-tab="mine"]').click();
    const params = new URLSearchParams(location.hash.replace("#verify=", ""));
    document.getElementById("mineType").value = params.get("t") || "diploma";
    document.getElementById("mineCountry").value = params.get("c") || "KEN";
    document.getElementById("mineRecordId").value = params.get("r") || "";
    document.getElementById("shareLink").value = location.href;
    document.getElementById("linkBox").style.display = "flex";
    openSharedLink();
  }
});
