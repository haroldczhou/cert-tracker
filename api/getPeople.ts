import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';
import { queryAll } from './utils/cosmos';

// use shared cosmos utils

export async function getPeople(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    // Get user info from SWA authentication
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const userDistrictId = userCtx.districtId;
    if (!userDistrictId) return ERR.NO_DISTRICT();
    if (!authorizeRole(userCtx.roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    if (request.method !== 'GET') {
      return { status: 405, body: 'Method not allowed' };
    }

    const url = new URL(request.url);
    let schoolId = url.searchParams.get('schoolId');

    let q = 'SELECT * FROM c WHERE c.type = @type AND c.districtId = @districtId AND c.active = true';
    const params: any[] = [
      { name: '@type', value: 'person' },
      { name: '@districtId', value: userDistrictId },
    ];

    if (!userCtx.roles.has('district_admin') && userCtx.roles.has('school_admin')) {
      const profile = await getUserProfile(userDistrictId, userCtx.userId);
      if (profile?.schoolId) schoolId = profile.schoolId;
    }

    if (schoolId) {
      q += ' AND c.schoolId = @schoolId';
      params.push({ name: '@schoolId', value: schoolId });
    }

    q += ' ORDER BY c.fullName ASC';

    const people = await queryAll<any>({ query: q, parameters: params });

    return ok(people);

  } catch (error) {
    context.log('Error getting people:', error);
    return ERR.INTERNAL();
  }
}

app.http('getPeople', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getPeople
});
