import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function listCertEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();

    const url = new URL(request.url);
    const certId = url.searchParams.get('certId');
    if (!certId) return ERR.VALIDATION('Missing certId');

    const certs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'cert' },
        { name: '@cid', value: certId },
        { name: '@did', value: districtId },
      ],
    });
    if (certs.length === 0) return ERR.NOT_FOUND('Cert not found');
    const cert = certs[0];

    let allowed = authorizeRole(roles, ['district_admin', 'school_admin']);
    if (!allowed && roles.has('staff')) {
      const people = await queryAll<any>({
        query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did AND (c.authUid = @uid OR c.email = @email)',
        parameters: [
          { name: '@t', value: 'person' },
          { name: '@pid', value: cert.personId },
          { name: '@did', value: districtId },
          { name: '@uid', value: userId },
          { name: '@email', value: userCtx.userEmail ?? '' },
        ],
      });
      allowed = people.length > 0;
    }
    if (!allowed) return ERR.FORBIDDEN();
    if (roles.has('school_admin') && !roles.has('district_admin')) {
      const profile = await getUserProfile(districtId, userId);
      if (profile?.schoolId && profile.schoolId !== cert.schoolId) return ERR.FORBIDDEN('Forbidden for this school');
    }

    const evidences = await queryAll<any>({
      query: 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did AND c.certId = @cid ORDER BY c.uploadedAt DESC',
      parameters: [
        { name: '@t', value: 'certEvidence' },
        { name: '@did', value: districtId },
        { name: '@cid', value: certId },
      ],
    });
    return ok({ certId, currentEvidenceId: cert.currentEvidenceId ?? null, evidences });
  } catch (error) {
    context.log('Error listing cert evidence:', error);
    return ERR.INTERNAL();
  }
}

app.http('listCertEvidence', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: listCertEvidence,
});

