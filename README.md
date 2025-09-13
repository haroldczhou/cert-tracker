# Certification Expiry Tracker

A lightweight web app that tracks staff certifications for K-12 districts and childcare/daycare networks.

## Week 1 MVP Features

✅ **Completed**:
- Next.js static export with PWA capabilities
- Azure Static Web App configuration
- Microsoft Entra (Azure AD) authentication integration
- Azure Functions HTTP endpoints (createPerson, issueSAS, getPeople, getSchools)
- Cosmos DB data models and types
- Private Blob storage upload via SAS tokens (5MB file limit)
- Minimal dashboard UI with authentication
- Staff management flows (add/view)
- Local development environment setup

## Architecture

- **Frontend**: Next.js with static export + PWA on Azure Static Web Apps
- **APIs**: Azure Functions (HTTP) for CRUD operations
- **Database**: Azure Cosmos DB (SQL API) with single container
- **Storage**: Azure Blob Storage (private) for document uploads
- **Auth**: Microsoft Entra via SWA built-in authentication

## File Upload Security

- **File Size Limit**: 5MB per file with client-side validation
- **Allowed Types**: PDF, JPG, PNG, DOC, DOCX only
- **Storage**: Private Azure Blob container with SAS token access
- **Security**: 15-minute SAS token expiry, tenant scoping via districtId
- **Validation**: Real-time file size and type validation with user-friendly error messages

## 🚨 Azure Deployment Status

**Current Status**: Azure resources blocked by organizational policy  
**Details**: See [AZURE_STATUS.md](./AZURE_STATUS.md) for full details

Azure for Students subscriptions from Texas A&M have restrictions that prevent resource creation. The application is fully functional locally for development and testing.

## Local Development

### Prerequisites

- Node.js 20+
- Azure CLI (for future deployment)
- Azure Functions Core Tools v4
- Azure Static Web Apps CLI

### Quick Start (Local Testing)

1. Install dependencies:
   ```bash
   npm install
   cd api && npm install
   ```

2. Build and start local development:
   ```bash
   npm run build
   swa start out --api-location api
   ```

3. Open http://localhost:4280

### Available Pages (Local Testing)
- **http://localhost:4280/local-test** - Development dashboard (no auth required)
- **http://localhost:4280/demo** - File upload demo with 5MB validation
- **http://localhost:4280** - Home page (redirects to Azure AD - will show 400 error locally)

### Full Development with Hot Reload
```bash
npm run dev  # Next.js dev server on port 3001
```

### File Upload Demo

Visit `/demo` to test the file upload functionality and see validation in action.

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
- `POST /api/issueSAS` - Generate SAS token for file upload (5MB limit)

## Security

- Authentication required for all routes
- Tenant isolation via `districtId` partition key
- Private blob storage with short-lived SAS tokens
- File type and size validation (5MB limit)
- Audit logging for all operations

## Next Steps (Week 2)

- Timer Function for reminder scheduling
- Azure Communication Services email integration
- Certification status logic and dashboard KPIs
- District-level rollups and filtering

## Next Steps (Week 3)

- Audit pack export (CSV/PDF)
- Role templates and invitation flows
- Error monitoring and rate limiting
