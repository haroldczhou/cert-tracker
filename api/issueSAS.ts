import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function issueSAS(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const userDistrictId = userCtx.districtId;
    if (!userDistrictId) return ERR.NO_DISTRICT();
    if (!authorizeRole(userCtx.roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = await request.json() as any;
    const { fileName, contentType } = body;

    if (!fileName) return ERR.VALIDATION('fileName is required', { required: ['fileName'] });

    // Validate file extension (basic security)
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExt)) {
      return ERR.VALIDATION('File type not allowed', { allowed: allowedExtensions });
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
    const containerName = 'certs';

    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    
    // Generate a unique blob name with district scoping
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const blobName = `${userDistrictId}/${timestamp}_${randomId}_${fileName}`;

    // Create SAS token valid for 15 minutes
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    const sasOptions = {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('w'), // Write only
      expiresOn,
      contentType: contentType || 'application/octet-stream'
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, credential).toString();
    const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

    return ok({ uploadUrl, blobName, expiresOn: expiresOn.toISOString() });

  } catch (error) {
    context.log('Error issuing SAS token:', error);
    return ERR.INTERNAL();
  }
}

app.http('issueSAS', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: issueSAS
});
