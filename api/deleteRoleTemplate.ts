import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function deleteRoleTemplate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'DELETE') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin'])) return ERR.FORBIDDEN();

    const url = new URL(request.url);
    const roleKey = url.searchParams.get('roleKey');
    if (!roleKey) return ERR.VALIDATION('Missing roleKey');

    const id = `role:${districtId}:${roleKey}`;
    await entities.item(id, districtId).delete();
    return ok({ id, deleted: true });
  } catch (error) {
    context.log('Error deleting role template:', error);
    return ERR.INTERNAL();
  }
}

app.http('deleteRoleTemplate', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: deleteRoleTemplate,
});

