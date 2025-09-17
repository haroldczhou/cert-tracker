Azure AD B2C custom policy templates

Overview
- Enforces strict signup: only emails pre-added by district admins may create local (email + password) accounts.
- Adds `extension_districtId` to the user’s token so the app can resolve district context on sign-in.

Files
- TrustFrameworkExtensions.xml — defines claims, REST API technical profile, and validation.
- SignUpOrSignIn.xml — a user journey referencing the validation during local account sign‑up.

Prerequisites
- Use Microsoft’s starter pack as the base (download from official samples):
  - TrustFrameworkBase.xml
  - TrustFrameworkLocalization.xml (optional)
  - TrustFrameworkExtensions.xml (replace with this repo’s version)
  - SignUpOrSignIn.xml (replace with this repo’s version)

Placeholders to replace
- YOUR_TENANT_NAME: Your B2C tenant (e.g., contoso)
- YOUR_POLICY_PREFIX: e.g., B2C_1A
- YOUR_SWA_HOST: Your Static Web App hostname (e.g., myapp.azurestaticapps.net)

Steps
1) Upload base files from Microsoft starter pack.
2) Edit this repo’s XML files and replace placeholders above.
3) Upload TrustFrameworkExtensions.xml and SignUpOrSignIn.xml to your B2C tenant.
4) Create a user flow or custom policy relying on SignUpOrSignIn and set it as your OIDC metadata/user flow in SWA.

Notes
- The REST API endpoint is `https://YOUR_SWA_HOST/api/validateSignupEmail` and must be reachable publicly (anonymous).
- The endpoint returns `{ allow: boolean, districtId?: string }`. The policy maps `allow` to `isApproved` and blocks sign-up if false.

