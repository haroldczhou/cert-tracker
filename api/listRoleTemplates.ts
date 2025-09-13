import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function listRoleTemplates(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    const docs = await queryAll<any>({
      query: 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'roleTemplate' },
        { name: '@did', value: districtId },
      ],
    });
    return ok(docs);
  } catch (error) {
    context.log('Error listing role templates:', error);
    return ERR.INTERNAL();
  }
}

app.http('listRoleTemplates', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: listRoleTemplates,
});

