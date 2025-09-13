import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function upsertRoleTemplate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin'])) return ERR.FORBIDDEN();

    const body = (await request.json()) as { roleKey: string; requiredCertTypes: Array<{ key: string; validMonths?: number }> };
    if (!body?.roleKey || !Array.isArray(body?.requiredCertTypes)) return ERR.VALIDATION('roleKey and requiredCertTypes are required');

    const doc = {
      id: `role:${districtId}:${body.roleKey}`,
      type: 'roleTemplate',
      districtId,
      roleKey: body.roleKey,
      requiredCertTypes: body.requiredCertTypes,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const { resource } = await entities.items.upsert(doc);
    return ok(resource);
  } catch (error) {
    context.log('Error upserting role template:', error);
    return ERR.INTERNAL();
  }
}

app.http('upsertRoleTemplate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: upsertRoleTemplate,
});

