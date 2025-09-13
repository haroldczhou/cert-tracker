import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function rejectEmailChange(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { requestId: string; reason?: string };
    const { requestId, reason } = body || ({} as any);
    if (!requestId) return ERR.VALIDATION('requestId is required', { required: ['requestId'] });

    const reqs = await queryAll<any>({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did', parameters: [{ name: '@t', value: 'emailChange' }, { name: '@id', value: requestId }, { name: '@did', value: districtId }] });
    if (reqs.length === 0) return ERR.NOT_FOUND('Request not found');
    const reqDoc = reqs[0];
    if (reqDoc.status !== 'pending') return ERR.CONFLICT('Request already processed');

    reqDoc.status = 'rejected';
    reqDoc.rejectionReason = reason ?? null;
    reqDoc.updatedAt = new Date().toISOString();
    await entities.items.upsert(reqDoc);
    return ok({ rejected: true });
  } catch (e) {
    context.log('rejectEmailChange error', e);
    return ERR.INTERNAL();
  }
}

app.http('rejectEmailChange', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: rejectEmailChange,
});

