// registries/kenya/adapter.js
//
// The ONLY code Kenya would need to write to join A-Road. It never
// exposes its raw database — it maps its own records into the shared
// schema on request, and signs the response with its own private key
// (see keys.js — that key never leaves this file's scope).

const data = require("./data.json");
const { sign } = require("../../protocol/sign.js");
const { publicKey, privateKey } = require("./keys.js");

const STATUS_MAP = { active: "valid", revoked: "revoked", expired: "expired" };

const COLLECTION_BY_TYPE = {
  diploma: "diplomas",
  business_registration: "business_registrations",
  civil_status: "civil_status",
  health_record: "health_records",
};

const ISSUER_FIELD = {
  diploma: "school",
  business_registration: "registrar",
  civil_status: "issuing_office",
  health_record: "facility",
};

function findRaw(credentialType, recordId) {
  const collection = data[COLLECTION_BY_TYPE[credentialType]] || [];
  return collection.find((r) => r.ref === recordId) || null;
}

// The one function every A-Road adapter must implement: given a
// credential type + record id, return a signed record in the shared
// schema, or null if Kenya has no such record.
function verify(credentialType, recordId) {
  const raw = findRaw(credentialType, recordId);
  if (!raw) return null;

  const holderName = raw.student_full_name || raw.business_name || raw.person_full_name || raw.patient_full_name;
  const holderIdentifier = raw.student_national_id || raw.owner_national_id || raw.person_national_id || raw.patient_national_id;

  const record = {
    recordId,
    credentialType,
    credentialTitle: raw.credential_title || raw.record_type || null,
    holderName,
    holderIdentifier,
    issuingCountry: "KEN",
    issuingInstitution: raw[ISSUER_FIELD[credentialType]],
    issueDate: raw.awarded || raw.registered_on || raw.issued_on,
    status: STATUS_MAP[raw.current_status] || "expired",
    lastConfirmed: new Date().toISOString(),
    demoDisclaimer: "DEMO / MOCK NATIONAL REGISTRY — not a real government system",
  };

  record.signature = sign(record, privateKey);
  return record;
}

module.exports = { verify, countryCode: "KEN", countryName: "Kenya", publicKey };
