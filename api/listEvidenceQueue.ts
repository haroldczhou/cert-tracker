import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function listEvidenceQueue(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();

    const url = new URL(request.url);
    let schoolId = url.searchParams.get('schoolId') ?? undefined;
    const status = url.searchParams.get('status') ?? 'pending'; // pending|complete|approved|rejected|all

    if (!roles.has('district_admin') && roles.has('school_admin')) {
      const profile = await getUserProfile(districtId, userId);
      if (profile?.schoolId) schoolId = profile.schoolId;
    }

    let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
    const params: any[] = [
      { name: '@t', value: 'certEvidence' },
      { name: '@did', value: districtId },
    ];
    if (schoolId) { q += ' AND c.schoolId = @sid'; params.push({ name: '@sid', value: schoolId }); }
    if (status && status !== 'all') { q += ' AND c.status = @st'; params.push({ name: '@st', value: status }); }
    q += ' ORDER BY c.uploadedAt DESC';

    const evidence = await queryAll<any>({ query: q, parameters: params });
    return ok({ items: evidence });
  } catch (e) {
    context.log('Error listing evidence queue', e);
    return ERR.INTERNAL();
  }
}

app.http('listEvidenceQueue', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: listEvidenceQueue,
});

