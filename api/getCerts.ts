import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function getCerts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const userDistrictId = userCtx.districtId;
    if (!userDistrictId) return ERR.NO_DISTRICT();
    if (!authorizeRole(userCtx.roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    if (request.method !== 'GET') return { status: 405, body: 'Method not allowed' };

    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? undefined;
    let schoolId = url.searchParams.get('schoolId') ?? undefined;
    const personId = url.searchParams.get('personId') ?? undefined;
    const certTypeKey = url.searchParams.get('certTypeKey') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined; // valid | expiring | expired
    const expiringWithinDays = url.searchParams.get('expiringWithinDays');

    let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
    const params: any[] = [
      { name: '@t', value: 'cert' },
      { name: '@did', value: userDistrictId },
    ];

    // If school_admin, force school scope
    if (!userCtx.roles.has('district_admin') && userCtx.roles.has('school_admin')) {
      const profile = await getUserProfile(userDistrictId, userCtx.userId);
      if (profile?.schoolId) {
        schoolId = profile.schoolId;
      }
    }

    if (id) {
      q += ' AND c.id = @id';
      params.push({ name: '@id', value: id });
    }
    if (schoolId) {
      q += ' AND c.schoolId = @sid';
      params.push({ name: '@sid', value: schoolId });
    }
    if (personId) {
      q += ' AND c.personId = @pid';
      params.push({ name: '@pid', value: personId });
    }
    if (certTypeKey) {
      q += ' AND c.certTypeKey = @ctk';
      params.push({ name: '@ctk', value: certTypeKey });
    }
    if (status) {
      q += ' AND c.status = @st';
      params.push({ name: '@st', value: status });
    }
    if (expiringWithinDays) {
      const days = parseInt(expiringWithinDays, 10);
      if (!Number.isNaN(days) && days >= 0) {
        const nowIso = new Date().toISOString();
        const upper = new Date();
        upper.setUTCDate(upper.getUTCDate() + days);
        const upperIso = upper.toISOString();
        q += ' AND c.expiryDate >= @now AND c.expiryDate < @upper';
        params.push({ name: '@now', value: nowIso }, { name: '@upper', value: upperIso });
      }
    }

    q += ' ORDER BY c.expiryDate ASC';

    const certs = await queryAll<any>({ query: q, parameters: params });
    return ok(certs);
  } catch (error) {
    context.log('Error getting certs:', error);
    return ERR.INTERNAL();
  }
}

app.http('getCerts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getCerts,
});
