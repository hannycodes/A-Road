// registries/rwanda/adapter.js
//
// Rwanda's internal records look nothing like Kenya's (nested holder
// object, dd/mm/yyyy dates, upper-case status strings) — the adapter
// absorbs that difference. Signs with Rwanda's own private key.

const data = require("./data.json");
const { sign } = require("../../protocol/sign.js");
const { publicKey, privateKey } = require("./keys.js");

const STATUS_MAP = { VALID: "valid", REVOKED: "revoked", EXPIRED: "expired" };

const COLLECTION_BY_TYPE = {
  diploma: "diplomas",
  business_registration: "business_registrations",
  civil_status: "civil_status",
  health_record: "health_records",
};

function findRaw(credentialType, recordId) {
  const collection = data[COLLECTION_BY_TYPE[credentialType]] || [];
  return collection.find((r) => r.recordRef === recordId) || null;
}

function toIsoDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split("/");
  return `${y}-${m}-${d}`;
}

function verify(credentialType, recordId) {
  const raw = findRaw(credentialType, recordId);
  if (!raw) return null;

  const record = {
    recordId,
    credentialType,
    credentialTitle: raw.credentialTitle || raw.recordKind || null,
    holderName: raw.holder.name,
    holderIdentifier: raw.holder.idNumber,
    issuingCountry: "RWA",
    issuingInstitution: raw.issuer || raw.school,
    issueDate: toIsoDate(raw.dateAwarded),
    status: STATUS_MAP[raw.state] || "expired",
    lastConfirmed: new Date().toISOString(),
    demoDisclaimer: "DEMO / MOCK NATIONAL REGISTRY — not a real government system",
  };

  record.signature = sign(record, privateKey);
  return record;
}

module.exports = { verify, countryCode: "RWA", countryName: "Rwanda", publicKey };
