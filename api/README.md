# Certification Expiry Tracker

A lightweight web app that tracks staff certifications for K-12 districts and childcare/daycare networks.

## Week 1 MVP Features

✅ **Completed**:
- Next.js static export with PWA capabilities
- Azure Static Web App configuration
- Microsoft Entra (Azure AD) authentication integration
- Azure Functions HTTP endpoints (createPerson, issueSAS, getPeople, getSchools)
- Cosmos DB data models and types
- Private Blob storage upload via SAS tokens
- Minimal dashboard UI with authentication
- Staff management flows (add/view)
- Local development environment setup

## Architecture

- **Frontend**: Next.js with static export + PWA on Azure Static Web Apps
- **APIs**: Azure Functions (HTTP) for CRUD operations
- **Database**: Azure Cosmos DB (SQL API) with single container
- **Storage**: Azure Blob Storage (private) for document uploads
- **Auth**: Microsoft Entra via SWA built-in authentication

## Local Development

### Prerequisites

- Node.js 20+
- Azure CLI
- Azure Functions Core Tools v4
- Azure Static Web Apps CLI

### Setup

1. Install dependencies:
   ```bash
   npm install
   cd api && npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Configure Azure resources and update environment variables

4. Start local development:
   ```bash
   npm run dev
   ```

   Or with SWA CLI (includes auth simulation):
   ```bash
   npm run swa:start
   ```

### Azure Resources Setup

1. **Resource Group**: `rg-cert-tracker`
2. **Cosmos DB**: SQL API database `app`, container `entities` (partition key `/districtId`)
3. **Storage Account**: Container `certs` (private)
4. **Static Web App**: Connected to this repository
5. **Azure AD App Registration**: For authentication

## Data Model

Single Cosmos DB container with type discriminator:

- **district**: Organization
- **school**: School within district
- **profile**: User profile (linked to Entra ID)
- **person**: Staff member
- **certType**: Certification types
- **cert**: Individual certifications
- **reminder**: Reminder records
- **audit**: Audit logs

## API Endpoints

- `POST /api/createPerson` - Create new staff member
- `GET /api/getPeople` - List staff (filtered by school)
- `GET /api/getSchools` - List schools in district
- `POST /api/issueSAS` - Generate SAS token for file upload
- `POST /api/createCert` - Create a certification for a person (computes status, denormalizes district/school)
- `GET /api/getCerts` - List certifications (filters: schoolId, personId, certTypeKey, status, expiringWithinDays)
- `PATCH /api/updateCert?id=...` - Update fields on a certification (`issueDate`, `expiryDate`, `docPath`, `certTypeKey`; recomputes `status`)
- `GET /api/exportCertsCsv` - Export filtered certifications as CSV (joins person info)
- `POST /api/upsertProfile` - Create/update the current user's `profile` (id = auth userId); defaults to `roleKey: 'staff'` unless set by district_admin.
- `POST /api/staffUploadCertDoc` - Staff-only. Returns SAS URL and `evidenceId` to upload evidence for a `certId` (uses the same evidence flow as admins). Call `finalizeCertEvidence` after upload.
- `POST|PATCH /api/setPersonAuthUid` - Admin-only. Set `authUid` on a `person` (district-scoped; school_admin limited to their school).
- `POST /api/createCertEvidence` - Create a pending evidence record and return SAS URL for upload (admins or owning staff).
- `POST /api/finalizeCertEvidence` - Attach checksum/size and mark evidence complete; optionally set as current.
- `GET /api/listCertEvidence?certId=...` - List evidence for a cert, returns `currentEvidenceId` and all versions.
- `POST /api/setCurrentEvidence` - Admin-only. Set which evidence is current for a cert.
- `POST /api/createMagicLink` - Admin-only. Creates a one-time evidence upload link for a cert; returns `{ token, link }`.
- `POST /api/magicUploadCreateEvidence` - Unauthenticated. Use with `token` to get SAS and create a pending evidence.
- `POST /api/magicUploadFinalizeEvidence` - Unauthenticated. Use with `token` to finalize the uploaded evidence.
- `POST /api/approveEvidence` - Admin-only. Approve an evidence (sets as current).
- `POST /api/rejectEvidence` - Admin-only. Reject an evidence with optional reason.
- `GET /api/getDistrictConfig` - Fetch district config (reminderOffsets, expiringThresholdDays, etc.).
- `POST /api/setDistrictConfig` - Admin-only. Upsert district config.
- `GET /api/listRoleTemplates` - List role templates for the district.
- `POST /api/upsertRoleTemplate` - Admin-only. Upsert a role template with required certTypes.
- `DELETE /api/deleteRoleTemplate?roleKey=...` - Admin-only. Delete a role template.
- `POST /api/sendRemindersForPerson` - Admin-only. Send reminder links for all expiring (or expired) certs for a person.
- `POST /api/requestEmailChange` - Staff or admin. Create a pending email-change request for a person (self-resolved or specified by admin).
- `POST /api/approveEmailChange` - Admin-only. Approve pending email change and apply to person.email.
- `POST /api/rejectEmailChange` - Admin-only. Reject email change request with optional reason.

## Reminder Engine (Timer Function)

- Function: `reminderEngine` (Timer Trigger, hourly)
- Logic: finds `cert` docs with `expiryDate` at district-configured offsets (defaults: 60/30/7/1/0), sends email reminders via ACS, writes a `reminder` document per send (idempotent by `certId` + `windowOffsetDays`).
- Function: `statusSweeper` (Timer Trigger, daily 02:00 UTC)
- Logic: recomputes `cert.status` for all certs using district-configured `expiringThresholdDays` (default 30) and updates `statusComputedAt`.
- Env vars:
  - `ACS_CONNECTION_STRING` Azure Communication Services Email connection string
  - `REMINDER_FROM_EMAIL` Verified sender address

Run locally (Functions app):
```bash
cd api
npm install
npm run build && npm start
```

## Security

- Authentication required for all routes
- Tenant isolation via `districtId` partition key
- Private blob storage with short-lived SAS tokens
- Audit logging for create/update/export
- Roles (MVP):
  - `district_admin`: full access within district.
  - `school_admin`: scoped to their `profile.schoolId` (auto-applied on queries/exports).
  - `staff`: no API access to admin endpoints (future: self-service upload only).

## Magic Link Upload
- For contractors or users without accounts. Admins create a link tied to a cert; the recipient visits `/magic-upload?token=...` to upload once.
- Links expire and are single-use; all actions are auditable.

## Error Model
- All endpoints return structured errors for validation/authz failures:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Missing required fields", "details": { "required": ["personId"] } } }
  ```
- Common codes: `UNAUTHORIZED`, `USER_NO_DISTRICT`, `FORBIDDEN`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.

## Next Steps (Week 2)

- Timer Function for reminder scheduling
- Azure Communication Services email integration
- Certification status logic and dashboard KPIs
- District-level rollups and filtering

## Next Steps (Week 3)

- Audit pack export (CSV/PDF)
- Role templates and invitation flows
- Error monitoring and rate limiting
