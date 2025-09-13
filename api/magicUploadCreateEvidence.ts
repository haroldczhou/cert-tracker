import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { ERR, ok } from './utils/http';
import { BlobSASPermissions, StorageSharedKeyCredential, generateBlobSASQueryParameters } from '@azure/storage-blob';

export async function magicUploadCreateEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    const body = (await request.json()) as { token: string; fileName: string; contentType?: string };
    const { token, fileName, contentType } = body || ({} as any);
    if (!token || !fileName) return ERR.VALIDATION('Missing required fields', { required: ['token', 'fileName'] });

    const links = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id',
      parameters: [
        { name: '@t', value: 'magicLink' },
        { name: '@id', value: token },
      ],
    });
    if (links.length === 0) return ERR.NOT_FOUND('Invalid link');
    const link = links[0];
    if (link.used) return ERR.CONFLICT('Link already used');
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return ERR.CONFLICT('Link expired');
    if (link.evidenceId) return ERR.CONFLICT('Evidence already created for this link');

    const certs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid',
      parameters: [
        { name: '@t', value: 'cert' },
        { name: '@cid', value: link.certId },
      ],
    });
    if (certs.length === 0) return ERR.NOT_FOUND('Cert not found');
    const cert = certs[0];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) return ERR.VALIDATION('File type not allowed', { allowed: allowedExtensions });

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
    const containerName = 'certs';
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const evidenceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const blobName = `${cert.districtId}/${cert.personId}/${cert.id}/${evidenceId}_${fileName}`;
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
    const sasOptions = {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('cw'),
      expiresOn,
      contentType: contentType || 'application/octet-stream',
    };
    const sasToken = generateBlobSASQueryParameters(sasOptions, credential).toString();
    const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

    const evidenceDoc = {
      id: evidenceId,
      type: 'certEvidence',
      districtId: cert.districtId,
      certId: cert.id,
      personId: cert.personId,
      schoolId: cert.schoolId ?? null,
      blobPath: blobName,
      contentType: contentType || null,
      size: null,
      sha256: null,
      uploadedAt: null,
      uploadedByUid: null,
      status: 'pending',
      fileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await entities.items.create(evidenceDoc);

    link.evidenceId = evidenceId;
    await entities.items.upsert(link);

    return ok({ evidenceId, uploadUrl, blobName, expiresOn: expiresOn.toISOString() });
  } catch (e) {
    context.log('Magic upload create error', e);
    return ERR.INTERNAL();
  }
}

app.http('magicUploadCreateEvidence', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: magicUploadCreateEvidence,
});
