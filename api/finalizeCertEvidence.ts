import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function finalizeCertEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, roles } = userCtx;
    if (!districtId || !userId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { certId: string; evidenceId: string; sha256: string; size: number; contentType?: string; setCurrent?: boolean };
    const { certId, evidenceId, sha256, size, contentType, setCurrent } = body || ({} as any);
    if (!certId || !evidenceId || !sha256 || !size) return ERR.VALIDATION('Missing required fields', { required: ['certId', 'evidenceId', 'sha256', 'size'] });

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

    // Authorization
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
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @eid AND c.districtId = @did AND c.certId = @cid',
      parameters: [
        { name: '@t', value: 'certEvidence' },
        { name: '@eid', value: evidenceId },
        { name: '@did', value: districtId },
        { name: '@cid', value: certId },
      ],
    });
    if (evidences.length === 0) return ERR.NOT_FOUND('Evidence not found');
    const evidence = evidences[0];

    evidence.sha256 = sha256;
    evidence.size = size;
    if (contentType) evidence.contentType = contentType;
    evidence.uploadedAt = new Date().toISOString();
    evidence.status = 'complete';
    evidence.updatedAt = new Date().toISOString();
    await entities.items.upsert(evidence);

    if (setCurrent) {
      cert.currentEvidenceId = evidence.id;
      cert.updatedAt = new Date().toISOString();
      await entities.items.upsert(cert);
    }

    return ok({ evidence, cert });
  } catch (error) {
    context.log('Error finalizing cert evidence:', error);
    return ERR.INTERNAL();
  }
}

app.http('finalizeCertEvidence', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: finalizeCertEvidence,
});

