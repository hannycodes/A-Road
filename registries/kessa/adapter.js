// registries/kessa/adapter.js
//
// Kessa's internal records look nothing like Meridia's (nested holder
// object, dd/mm/yyyy dates, upper-case status strings) — the adapter
// pattern absorbs that difference so the exchange layer and every
// client only ever see the one shared schema.

const data = require("./data.json");
const { sign } = require("../../protocol/sign.js");

const KESSA_SECRET = "kessa-demo-secret-key";

const STATUS_MAP = {
  VALID: "valid",
  REVOKED: "revoked",
  EXPIRED: "expired",
};

const COLLECTION_BY_TYPE = {
  diploma: "diplomas",
  business_registration: "business_registrations",
  civil_status: "civil_status",
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
    holderName: raw.holder.name,
    holderIdentifier: raw.holder.idNumber,
    issuingCountry: "KES",
    issuingInstitution: raw.issuer,
    issueDate: toIsoDate(raw.dateAwarded),
    status: STATUS_MAP[raw.state] || "expired",
    lastConfirmed: new Date().toISOString(),
  };

  record.signature = sign(record, KESSA_SECRET);
  return record;
}

module.exports = { verify, countryCode: "KES", secret: KESSA_SECRET };
