import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function setCurrentEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { certId: string; evidenceId: string };
    const { certId, evidenceId } = body || ({} as any);
    if (!certId || !evidenceId) return ERR.VALIDATION('Missing required fields', { required: ['certId', 'evidenceId'] });

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

    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (roles.has('school_admin') && !roles.has('district_admin')) {
      const profile = await getUserProfile(districtId, userId);
      if (profile?.schoolId && profile.schoolId !== cert.schoolId) return ERR.FORBIDDEN('Forbidden for this school');
    }

    const evidences = await queryAll<any>({
      query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.id = @eid AND c.districtId = @did AND c.certId = @cid',
      parameters: [
        { name: '@t', value: 'certEvidence' },
        { name: '@eid', value: evidenceId },
        { name: '@did', value: districtId },
        { name: '@cid', value: certId },
      ],
    });
    if (evidences.length === 0) return ERR.NOT_FOUND('Evidence not found');

    cert.currentEvidenceId = evidenceId;
    cert.updatedAt = new Date().toISOString();
    const { resource } = await entities.items.upsert(cert);
    return ok(resource);
  } catch (error) {
    context.log('Error setting current evidence:', error);
    return ERR.INTERNAL();
  }
}

app.http('setCurrentEvidence', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: setCurrentEvidence,
});

