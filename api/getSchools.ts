import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function getSchools(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const userDistrictId = userCtx.districtId;
    if (!userDistrictId) return ERR.NO_DISTRICT();
    if (!authorizeRole(userCtx.roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();

    const schools = await queryAll<any>({
      query: 'SELECT * FROM c WHERE c.type = @type AND c.districtId = @districtId ORDER BY c.name ASC',
      parameters: [
        { name: '@type', value: 'school' },
        { name: '@districtId', value: userDistrictId },
      ],
    });

    return ok(schools);

  } catch (error) {
    context.log('Error getting schools:', error);
    return ERR.INTERNAL();
  }
}

app.http('getSchools', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getSchools
});
