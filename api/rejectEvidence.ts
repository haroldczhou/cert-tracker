import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';
import { auditLog } from './utils/audit';

export async function rejectEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    const body = (await request.json()) as { certId: string; evidenceId: string; reason?: string };
    const { certId, evidenceId, reason } = body || ({} as any);
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

    evidence.status = 'rejected';
    (evidence as any).rejectedAt = new Date().toISOString();
    (evidence as any).rejectionReason = reason ?? null;
    evidence.updatedAt = new Date().toISOString();
    await entities.items.upsert(evidence);

    await auditLog(districtId, userId ?? null, 'reject_evidence', 'cert', cert.id, { evidenceId, reason: reason ?? null });
    return ok({ evidence });
  } catch (e) {
    context.log('Reject evidence error', e);
    return ERR.INTERNAL();
  }
}

app.http('rejectEvidence', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: rejectEvidence,
});

