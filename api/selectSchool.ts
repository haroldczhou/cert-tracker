import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext, getUserProfile } from './utils/auth';
import { entities, queryAll } from './utils/cosmos';
import { ERR, ok } from './utils/http';

export async function selectSchool(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, userEmail } = userCtx;
    if (!districtId || !userId || !userEmail) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { personId?: string; schoolId?: string };
    let { personId, schoolId } = body || {};

    if (!schoolId && personId) {
      const p = await queryAll<any>({
        query: 'SELECT TOP 1 c.schoolId FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did',
        parameters: [
          { name: '@t', value: 'person' },
          { name: '@pid', value: personId },
          { name: '@did', value: districtId },
        ],
      });
      schoolId = p[0]?.schoolId;
    }
    if (!schoolId) return ERR.VALIDATION('schoolId is required');

    // Ensure the email has a person record with this school
    const check = await queryAll<any>({
      query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.districtId = @did AND LOWER(c.email) = @eml AND c.schoolId = @sid',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@did', value: districtId },
        { name: '@eml', value: userEmail.toLowerCase() },
        { name: '@sid', value: schoolId },
      ],
    });
    if (check.length === 0) return ERR.FORBIDDEN('Not allowed for this school');

    const profile = (await getUserProfile(districtId, userId)) || { id: userId, type: 'profile', districtId };
    profile.schoolId = schoolId;
    profile.updatedAt = new Date().toISOString();
    if (!profile.createdAt) profile.createdAt = new Date().toISOString();
    await entities.items.upsert(profile);

    return ok({ success: true, schoolId });
  } catch (e) {
    context.log('selectSchool error', e);
    return ERR.INTERNAL();
  }
}

app.http('selectSchool', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: selectSchool,
});

