import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobSASPermissions, StorageSharedKeyCredential, generateBlobSASQueryParameters } from '@azure/storage-blob';
import { queryAll, entities } from './utils/cosmos';
import { getUserContext } from './utils/auth';
import { auditLog } from './utils/audit';
import { ERR, ok } from './utils/http';

export async function staffUploadCertDoc(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, roles } = userCtx;
    if (!districtId || !userId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    // Only staff can use this endpoint (admins should use admin flows)
    if (!(roles.has('staff') && !roles.has('district_admin') && !roles.has('school_admin'))) {
      return ERR.FORBIDDEN('Staff-only endpoint');
    }

    const body = (await request.json()) as { certId: string; fileName: string; contentType?: string };
    const { certId, fileName, contentType } = body || ({} as any);
    if (!certId || !fileName) return ERR.VALIDATION('Missing required fields', { required: ['certId', 'fileName'] });

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExt)) {
      return ERR.VALIDATION('File type not allowed', { allowed: allowedExtensions });
    }

    // Resolve person linked to this user
    const people = await queryAll<any>({
      query:
        'SELECT TOP 1 c.id, c.districtId FROM c WHERE c.type = @t AND c.districtId = @did AND (c.authUid = @uid OR c.email = @email)',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@did', value: districtId },
        { name: '@uid', value: userId },
        { name: '@email', value: userCtx.userEmail ?? '' },
      ],
    });
    if (people.length === 0) return ERR.FORBIDDEN('No person record linked to this user');
    const person = people[0];

    // Verify cert belongs to person
    const certs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid AND c.districtId = @did AND c.personId = @pid',
      parameters: [
        { name: '@t', value: 'cert' },
        { name: '@cid', value: certId },
        { name: '@did', value: districtId },
        { name: '@pid', value: person.id },
      ],
    });
    if (certs.length === 0) return ERR.FORBIDDEN('Cert not found or not owned by user');
    const cert = certs[0];

    // Create a pending certEvidence record and return SAS (aligns with createCertEvidence)
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
    const containerName = 'certs';
    const credential = new StorageSharedKeyCredential(accountName, accountKey);

    const evidenceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const blobName = `${districtId}/${person.id}/${cert.id}/${evidenceId}_${fileName}`;
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
      districtId,
      certId: cert.id,
      personId: person.id,
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

    await auditLog(districtId, userId, 'staff_upload_cert_doc', 'cert', cert.id, { blobName, evidenceId });
    return ok({ evidenceId, uploadUrl, blobName, expiresOn: expiresOn.toISOString() });
  } catch (error) {
    context.log('Error issuing staff cert SAS:', error);
    return ERR.INTERNAL();
  }
}

app.http('staffUploadCertDoc', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: staffUploadCertDoc,
});
