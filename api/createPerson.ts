import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { auditLog } from './utils/audit';
import { ERR, created } from './utils/http';
import { randomUUID } from 'node:crypto';

export async function createPerson(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const userDistrictId = userCtx.districtId;
    if (!userDistrictId) return ERR.NO_DISTRICT();
    if (!authorizeRole(userCtx.roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as any;
    const { fullName, email, roleKey, schoolId, sendInvite, certIdForUpload } = body;

    if (!fullName || !email || !roleKey || !schoolId) {
      return ERR.VALIDATION('Missing required fields', { required: ['fullName', 'email', 'roleKey', 'schoolId'] });
    }

    // Verify the school belongs to the user's district
    const schoolQuery = {
      query: 'SELECT * FROM c WHERE c.type = @type AND c.id = @schoolId AND c.districtId = @districtId',
      parameters: [
        { name: '@type', value: 'school' },
        { name: '@schoolId', value: schoolId },
        { name: '@districtId', value: userDistrictId }
      ]
    };

    const { resources: schools } = await entities.items.query(schoolQuery).fetchAll();
    if (schools.length === 0) {
      return ERR.FORBIDDEN('School not found or access denied');
    }

    const nowIso = new Date().toISOString();
    const personId = randomUUID();

    const person = {
      id: personId,
      type: 'person',
      districtId: userDistrictId,
      schoolId,
      roleKey,
      fullName,
      email,
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const { resource: createdPerson } = await entities.items.create(person);
    await auditLog(userDistrictId, userCtx.userId ?? null, 'create', 'person', personId, { fullName, email, roleKey, schoolId });

    // Optional: send invite email (SWA login + optional magic link for a cert upload)
    if (sendInvite) {
      try {
        const base = process.env.PUBLIC_BASE_URL || '';
        const loginUrl = base ? `${base}/.auth/login/aad?post_login_redirect_uri=/dashboard` : undefined;
        let magicUrl: string | undefined;
        if (certIdForUpload) {
          const res = await fetch(new URL(request.url).origin + '/api/createMagicLink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-ms-client-principal': request.headers.get('x-ms-client-principal') || '' },
            body: JSON.stringify({ certId: certIdForUpload, expiresInMinutes: 60 * 24 }),
          } as any);
          if (res.ok) {
            const data = await res.json();
            magicUrl = data.link;
          }
        }
        const lines = [
          `Hello ${fullName},`,
          `An account has been created for you in the Certification Tracker.`,
          loginUrl ? `Login: ${loginUrl}` : '',
          magicUrl ? `Upload your certification evidence: ${magicUrl}` : '',
        ].filter(Boolean);
        // Best-effort; ignore failures
        try {
          const { sendEmail } = await import('./utils/email');
          await sendEmail(email, 'Your Certification Tracker access', lines.map((l) => `<p>${l}</p>`).join(''));
        } catch {}
      } catch {}
    }

    return created(createdPerson);

  } catch (error) {
    context.log('Error creating person:', error);
    return ERR.INTERNAL();
  }
}

app.http('createPerson', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createPerson
});
