import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';
import { auditLog } from './utils/audit';

export async function approveEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

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
    if (evidence.status !== 'complete') return ERR.CONFLICT('Evidence is not complete');

    evidence.status = 'approved';
    evidence.approvedAt = new Date().toISOString();
    evidence.updatedAt = new Date().toISOString();
    await entities.items.upsert(evidence);

    cert.currentEvidenceId = evidence.id;
    cert.updatedAt = new Date().toISOString();
    const { resource } = await entities.items.upsert(cert);

    await auditLog(districtId, userId ?? null, 'approve_evidence', 'cert', cert.id, { evidenceId });
    return ok(resource);
  } catch (e) {
    context.log('Approve evidence error', e);
    return ERR.INTERNAL();
  }
}

app.http('approveEvidence', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: approveEvidence,
});

