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
  const institutionLabel = INSTITUTIONS.find((i) => i.id === institution)?.name || institution;
  const credentialType = document.getElementById("credentialType").value;
  const country = document.getElementById("country").value;
  const recordId = document.getElementById("recordId").value.trim();
  const resultEl = document.getElementById("verifyResult");

  if (!recordId) {
    resultEl.className = "result fail";
    resultEl.textContent = "Enter a record reference to verify.";
    return;
  }

  // Build a visible process trace. Every line below reflects a real step
  // the code actually executes (see exchange/server.js handleVerify) —
  // this just stops hiding them behind one instant fetch response.
  resultEl.className = "result pending";
  resultEl.innerHTML = `<div id="processTrace"></div>`;
  const trace = document.getElementById("processTrace");

  function addStep(text, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const div = document.createElement("div");
        div.className = "process-step";
        div.innerHTML = `<span class="spinner"></span>${text}`;
        trace.appendChild(div);
        setTimeout(() => {
          div.querySelector(".spinner").outerHTML = '<span class="step-check">✓</span>';
          resolve();
        }, 260);
      }, delay);
    });
  }

  await addStep(`Verification request sent — ${credentialType.replace("_", " ")} · ${recordId}`, 0);
  await addStep(`A-Road exchange layer routing to ${country}'s adapter...`, 80);

  try {
    const params = new URLSearchParams({ credentialType, country, recordId, requestingInstitution: institution });
    const res = await fetch(`/api/verify?${params.toString()}`);
    const data = await res.json();

    if (!data.ok) { await addStep(`Error: ${data.error}`, 80); return; }
    if (!data.found) {
      await addStep(`${country}'s adapter searched its registry — no matching record found`, 80);
      const div = document.createElement("div");
      div.className = "result fail";
      div.style.marginTop = "12px";
      div.textContent = "❌ Could not verify — no matching record from the issuing country.";
      resultEl.appendChild(div);
      return;
    }

    const r = data.record;
    const fp = data.publicKeyFingerprint || "unknown";

    await addStep(`${r.issuingCountry} located the record and signed the response with its private key (Ed25519)`, 80);

    if (!data.signatureValid) {
      await addStep(`A-Road attempted to verify the signature — FAILED`, 80);
      const div = document.createElement("div");
      div.className = "result fail";
      div.style.marginTop = "12px";
      div.textContent = `⚠️ ${data.message}`;
      resultEl.appendChild(div);
      return;
    }

    await addStep(`A-Road independently verified the signature using ${r.issuingCountry}'s public key (fingerprint ${fp})`, 80);
    await addStep(`Logged to audit trail — requested by ${institutionLabel}`, 80);

    const icon = r.status === "valid" ? "✅" : r.status === "revoked" ? "❌" : "⚠️";
    const sigShort = r.signature ? `${r.signature.slice(0, 20)}...${r.signature.slice(-10)}` : "n/a";
    const div = document.createElement("div");
    div.className = "result ok";
    div.style.marginTop = "12px";
    div.innerHTML =
      `${icon} Status: ${r.status.toUpperCase()}\n` +
      `${r.credentialTitle ? "Title: " + r.credentialTitle + "\n" : ""}` +
      `Holder: ${r.holderName} (${r.holderIdentifier})\n` +
      `Issued by: ${r.issuingInstitution}, ${r.issuingCountry}\n` +
      `Issue date: ${r.issueDate}\n` +
      `Last confirmed: ${r.lastConfirmed}\n\n` +
      `<span class="crypto-detail">Ed25519 signature: ${sigShort}\nIssuer public key fingerprint: ${fp}</span>\n\n` +
      `${r.demoDisclaimer}`;
    resultEl.appendChild(div);
  } catch (err) {
    await addStep(`Could not reach the exchange layer: ${err.message}`, 80);
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
