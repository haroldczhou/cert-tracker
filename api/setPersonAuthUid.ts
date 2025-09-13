import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { auditLog } from './utils/audit';
import { ERR, ok } from './utils/http';

export async function setPersonAuthUid(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST' && request.method !== 'PATCH') return ERR.METHOD_NOT_ALLOWED();

    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    const body = (await request.json()) as { personId: string; authUid: string };
    const { personId, authUid } = body || ({} as any);
    if (!personId || !authUid) return ERR.VALIDATION('Missing required fields', { required: ['personId', 'authUid'] });

    // Load person
    const people = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@pid', value: personId },
        { name: '@did', value: districtId },
      ],
    });
    if (people.length === 0) return ERR.NOT_FOUND('Person not found');
    const person = people[0];

    // School scope for school_admin
    if (!roles.has('district_admin') && roles.has('school_admin')) {
      const profile = await getUserProfile(districtId, userId);
      if (profile?.schoolId && profile.schoolId !== person.schoolId) return ERR.FORBIDDEN('Forbidden for this school');
    }

    person.authUid = authUid;
    person.updatedAt = new Date().toISOString();
    const { resource } = await entities.items.upsert(person);
    await auditLog(districtId, userId ?? null, 'set_auth_uid', 'person', person.id, {});
    return ok(resource);
  } catch (error) {
    context.log('Error setting person authUid:', error);
    return ERR.INTERNAL();
  }
}

app.http('setPersonAuthUid', {
  methods: ['POST', 'PATCH'],
  authLevel: 'anonymous',
  handler: setPersonAuthUid,
});

