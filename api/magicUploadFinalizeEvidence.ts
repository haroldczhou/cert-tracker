import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { ERR, ok } from './utils/http';

export async function magicUploadFinalizeEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    const body = (await request.json()) as { token: string; evidenceId: string; sha256: string; size: number; contentType?: string };
    const { token, evidenceId, sha256, size, contentType } = body || ({} as any);
    if (!token || !evidenceId || !sha256 || !size) return ERR.VALIDATION('Missing required fields', { required: ['token', 'evidenceId', 'sha256', 'size'] });

    const links = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id',
      parameters: [
        { name: '@t', value: 'magicLink' },
        { name: '@id', value: token },
      ],
    });
    if (links.length === 0) return ERR.NOT_FOUND('Invalid link');
    const link = links[0];
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return ERR.CONFLICT('Link expired');
    if (link.evidenceId !== evidenceId) return ERR.FORBIDDEN('Evidence does not match link');

    const evidences = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @eid AND c.certId = @cid',
      parameters: [
        { name: '@t', value: 'certEvidence' },
        { name: '@eid', value: evidenceId },
        { name: '@cid', value: link.certId },
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

    // Automatically set as current for the cert (proactive teacher update)
    const certs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid',
      parameters: [
        { name: '@t', value: 'cert' },
        { name: '@cid', value: link.certId },
      ],
    });
    if (certs.length > 0) {
      const cert = certs[0];
      cert.currentEvidenceId = evidence.id;
      cert.updatedAt = new Date().toISOString();
      await entities.items.upsert(cert);
    }

    link.used = true;
    await entities.items.upsert(link);

    return ok({ evidence });
  } catch (e) {
    context.log('Magic upload finalize error', e);
    return ERR.INTERNAL();
  }
}

app.http('magicUploadFinalizeEvidence', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: magicUploadFinalizeEvidence,
});
