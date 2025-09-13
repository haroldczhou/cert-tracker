import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobSASPermissions, StorageSharedKeyCredential, generateBlobSASQueryParameters } from '@azure/storage-blob';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';
import { randomUUID } from 'node:crypto';

export async function createCertEvidence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, roles } = userCtx;
    if (!districtId || !userId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { certId: string; fileName: string; contentType?: string };
    const { certId, fileName, contentType } = body || ({} as any);
    if (!certId || !fileName) return ERR.VALIDATION('Missing required fields', { required: ['certId', 'fileName'] });

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExt)) {
      return ERR.VALIDATION('File type not allowed', { allowed: allowedExtensions });
    }

    // Load cert and person for scope
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

    // Authorization: admins; or staff who owns cert
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

    // If school_admin, ensure same school
    if (roles.has('school_admin') && !roles.has('district_admin')) {
      const profile = await getUserProfile(districtId, userId);
      if (profile?.schoolId && profile.schoolId !== cert.schoolId) return ERR.FORBIDDEN('Forbidden for this school');
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
    const containerName = 'certs';
    const credential = new StorageSharedKeyCredential(accountName, accountKey);

    const evidenceId = randomUUID();
    const timestamp = Date.now();
    const blobName = `${districtId}/${cert.personId}/${cert.id}/${evidenceId}_${fileName}`;
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

    // Create evidence document in pending state
    const evidenceDoc = {
      id: evidenceId,
      type: 'certEvidence',
      districtId,
      certId: cert.id,
      personId: cert.personId,
      schoolId: cert.schoolId ?? null,
      blobPath: blobName,
      contentType: contentType || null,
      size: null,
      sha256: null,
      uploadedAt: null,
      uploadedByUid: userId,
      status: 'pending',
      fileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await entities.items.create(evidenceDoc);

    return ok({ evidenceId, uploadUrl, blobName, expiresOn: expiresOn.toISOString() });
  } catch (error) {
    context.log('Error creating cert evidence:', error);
    return ERR.INTERNAL();
  }
}

app.http('createCertEvidence', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createCertEvidence,
});
