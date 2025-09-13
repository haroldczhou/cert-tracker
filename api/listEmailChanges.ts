import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function listEmailChanges(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'pending'; // pending|verified|approved|rejected|all
    const personId = url.searchParams.get('personId') ?? undefined;

    let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
    const params: any[] = [
      { name: '@t', value: 'emailChange' },
      { name: '@did', value: districtId },
    ];
    if (status !== 'all') { q += ' AND c.status = @st'; params.push({ name: '@st', value: status }); }
    if (personId) { q += ' AND c.personId = @pid'; params.push({ name: '@pid', value: personId }); }
    q += ' ORDER BY c.createdAt DESC';
    const items = await queryAll<any>({ query: q, parameters: params });
    return ok({ items });
  } catch (e) {
    context.log('listEmailChanges error', e);
    return ERR.INTERNAL();
  }
}

app.http('listEmailChanges', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: listEmailChanges,
});
