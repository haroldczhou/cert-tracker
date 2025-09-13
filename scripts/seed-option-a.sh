#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4280}"
DISTRICT_ID="${DISTRICT_ID:-district-001}"

principal_json=$(cat <<EOF
{
  "userId": "admin-1",
  "userDetails": "Admin User",
  "identityProvider": "aad",
  "userRoles": ["authenticated"],
  "claims": [
    {"typ":"extension_districtId","val":"${DISTRICT_ID}"},
    {"typ":"roles","val":"district_admin"}
  ]
}
EOF
)
PRINC=$(printf '%s' "$principal_json" | base64)

hdr=( -H "Content-Type: application/json" -H "x-ms-client-principal: ${PRINC}" )

echo "Seeding to ${BASE_URL} for district ${DISTRICT_ID}"

echo "Creating school..."
school_resp=$(curl -sS -X POST "${BASE_URL}/api/createSchool" "${hdr[@]}" -d '{"name":"Lincoln Elementary"}')
school_id=$(echo "$school_resp" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "School ID: ${school_id}"

echo "Creating person..."
person_resp=$(curl -sS -X POST "${BASE_URL}/api/createPerson" "${hdr[@]}" -d "{\"fullName\":\"Jane Teacher\",\"email\":\"jane.teacher@example.org\",\"roleKey\":\"teacher\",\"schoolId\":\"${school_id}\"}")
person_id=$(echo "$person_resp" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "Person ID: ${person_id}"

echo "Creating cert..."
expiry=$(date -u -v+20d +%Y-%m-%d 2>/dev/null || date -u -d "+20 days" +%Y-%m-%d)
curl -sS -X POST "${BASE_URL}/api/createCert" "${hdr[@]}" -d "{\"personId\":\"${person_id}\",\"certTypeKey\":\"cert-cpr\",\"expiryDate\":\"${expiry}\"}" >/dev/null
echo "Seed complete."

