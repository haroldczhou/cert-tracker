import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { computeStatus } from './utils/status';
import { randomUUID } from 'node:crypto';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { auditLog } from './utils/audit';
import { ERR, created } from './utils/http';

export async function createCert(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId: userDistrictId, roles, userId } = userCtx;
    if (!userDistrictId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    if (request.method !== 'POST') return { status: 405, body: 'Method not allowed' };

    const body = (await request.json()) as any;
    const { personId, certTypeKey, issueDate, expiryDate, docPath } = body ?? {};

    if (!personId || !certTypeKey || !expiryDate) {
      return ERR.VALIDATION('Missing required fields', { required: ['personId', 'certTypeKey', 'expiryDate'] });
    }

    // Verify person exists in district
    const people = await queryAll<any>({
      query: 'SELECT TOP 1 c.id, c.schoolId, c.districtId, c.fullName, c.email FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@pid', value: personId },
        { name: '@did', value: userDistrictId },
      ],
    });
    if (people.length === 0) return ERR.FORBIDDEN('Person not found or access denied');
    const person = people[0];

    // If school_admin, ensure same school
    if (!roles.has('district_admin') && roles.has('school_admin')) {
      const profile = await getUserProfile(userDistrictId, userId);
      if (profile?.schoolId && profile.schoolId !== person.schoolId) {
        return ERR.FORBIDDEN('Forbidden for this school');
      }
    }

    const status = computeStatus(expiryDate);

    const certDoc = {
      id: randomUUID(),
      type: 'cert',
      districtId: userDistrictId,
      schoolId: person.schoolId,
      personId,
      certTypeKey,
      issueDate: issueDate ?? null,
      expiryDate,
      docPath: docPath ?? null,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await entities.items.create(certDoc);
    await auditLog(userDistrictId, userId, 'create', 'cert', certDoc.id, { personId, certTypeKey });
    return created(resource);
  } catch (error) {
    context.log('Error creating cert:', error);
    return ERR.INTERNAL();
  }
}

app.http('createCert', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createCert,
});
