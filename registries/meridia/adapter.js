// registries/meridia/adapter.js
//
// This is the ONLY piece of code Meridia would need to write to join
// A-Road. It never exposes its raw database — it just maps its own
// records into the shared schema, on request, and signs the response
// with a key only Meridia holds.

const data = require("./data.json");
const { sign } = require("../../protocol/sign.js");

// Stands in for a private key Meridia's ministry would actually hold.
const MERIDIA_SECRET = "meridia-demo-secret-key";

const STATUS_MAP = {
  active: "valid",
  revoked: "revoked",
  expired: "expired",
};

const COLLECTION_BY_TYPE = {
  diploma: "diplomas",
  business_registration: "business_registrations",
  civil_status: "civil_status",
};

const ISSUER_FIELD = {
  diploma: "university",
  business_registration: "registrar",
  civil_status: "issuing_office",
};

function findRaw(credentialType, recordId) {
  const collection = data[COLLECTION_BY_TYPE[credentialType]] || [];
  return collection.find((r) => r.ref === recordId) || null;
}

// The one function every A-Road adapter must implement:
// given a credential type + record id, return a signed record in the
// shared schema, or null if Meridia has no such record.
function verify(credentialType, recordId) {
  const raw = findRaw(credentialType, recordId);
  if (!raw) return null;

  const holderName = raw.student_full_name || raw.business_name || raw.person_full_name;
  const holderIdentifier = raw.student_national_id || raw.owner_national_id || raw.person_national_id;

  const record = {
    recordId,
    credentialType,
    holderName,
    holderIdentifier,
    issuingCountry: "MER",
    issuingInstitution: raw[ISSUER_FIELD[credentialType]],
    issueDate: raw.awarded || raw.registered_on || raw.issued_on,
    status: STATUS_MAP[raw.current_status] || "expired",
    lastConfirmed: new Date().toISOString(),
  };

  record.signature = sign(record, MERIDIA_SECRET);
  return record;
}

module.exports = { verify, countryCode: "MER", secret: MERIDIA_SECRET };
