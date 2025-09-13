import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { auditLog } from './utils/audit';
import { ERR, ok } from './utils/http';

export async function upsertProfile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, userEmail, userName, roles } = userCtx;
    if (!districtId || !userId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json().catch(() => ({}))) as Partial<{ schoolId: string; roleKey: string }> | undefined;
    const incomingSchoolId = body?.schoolId;
    const incomingRoleKey = body?.roleKey;

    // Load existing profile
    const existing = await getUserProfile(districtId, userId);

    // Determine allowed updates
    let roleKey = existing?.roleKey || 'staff';
    let schoolId = existing?.schoolId || null;

    if (incomingRoleKey && authorizeRole(roles, ['district_admin'])) {
      roleKey = incomingRoleKey;
    }
    if (incomingSchoolId && (roles.has('district_admin') || roles.has('school_admin'))) {
      // school_admin can only set their own school
      if (roles.has('school_admin')) {
        const adminProfile = await getUserProfile(districtId, userId);
        if (adminProfile?.schoolId !== incomingSchoolId) {
          return ERR.FORBIDDEN('Forbidden to set different schoolId');
        }
      }
      schoolId = incomingSchoolId;
    }

    const profileDoc = {
      id: userId,
      type: 'profile',
      districtId,
      schoolId,
      roleKey,
      email: userEmail ?? null,
      name: userName ?? null,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const { resource } = await entities.items.upsert(profileDoc);
    await auditLog(districtId, userId, existing ? 'profile_update' : 'profile_create', 'profile', userId, { roleKey, schoolId });
    return ok(resource);
  } catch (error) {
    context.log('Error upserting profile:', error);
    return ERR.INTERNAL();
  }
}

app.http('upsertProfile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: upsertProfile,
});
