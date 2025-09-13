"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffUploadCertDoc = staffUploadCertDoc;
const functions_1 = require("@azure/functions");
const storage_blob_1 = require("@azure/storage-blob");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const audit_1 = require("./utils/audit");
const http_1 = require("./utils/http");
function staffUploadCertDoc(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, userId, roles } = userCtx;
            if (!districtId || !userId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            // Only staff can use this endpoint (admins should use admin flows)
            if (!(roles.has('staff') && !roles.has('district_admin') && !roles.has('school_admin'))) {
                return http_1.ERR.FORBIDDEN('Staff-only endpoint');
            }
            const body = (yield request.json());
            const { certId, fileName, contentType } = body || {};
            if (!certId || !fileName)
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['certId', 'fileName'] });
            const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
            const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
            if (!allowedExtensions.includes(fileExt)) {
                return http_1.ERR.VALIDATION('File type not allowed', { allowed: allowedExtensions });
            }
            // Resolve person linked to this user
            const people = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 c.id, c.districtId FROM c WHERE c.type = @t AND c.districtId = @did AND (c.authUid = @uid OR c.email = @email)',
                parameters: [
                    { name: '@t', value: 'person' },
                    { name: '@did', value: districtId },
                    { name: '@uid', value: userId },
                    { name: '@email', value: (_a = userCtx.userEmail) !== null && _a !== void 0 ? _a : '' },
                ],
            });
            if (people.length === 0)
                return http_1.ERR.FORBIDDEN('No person record linked to this user');
            const person = people[0];
            // Verify cert belongs to person
            const certs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid AND c.districtId = @did AND c.personId = @pid',
                parameters: [
                    { name: '@t', value: 'cert' },
                    { name: '@cid', value: certId },
                    { name: '@did', value: districtId },
                    { name: '@pid', value: person.id },
                ],
            });
            if (certs.length === 0)
                return http_1.ERR.FORBIDDEN('Cert not found or not owned by user');
            const cert = certs[0];
            // Create a pending certEvidence record and return SAS (aligns with createCertEvidence)
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
            const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
            const containerName = 'certs';
            const credential = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
            const evidenceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const blobName = `${districtId}/${person.id}/${cert.id}/${evidenceId}_${fileName}`;
            const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
            const sasOptions = {
                containerName,
                blobName,
                permissions: storage_blob_1.BlobSASPermissions.parse('cw'),
                expiresOn,
                contentType: contentType || 'application/octet-stream',
            };
            const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)(sasOptions, credential).toString();
            const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
            const evidenceDoc = {
                id: evidenceId,
                type: 'certEvidence',
                districtId,
                certId: cert.id,
                personId: person.id,
                schoolId: (_b = cert.schoolId) !== null && _b !== void 0 ? _b : null,
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
            yield cosmos_1.entities.items.create(evidenceDoc);
            yield (0, audit_1.auditLog)(districtId, userId, 'staff_upload_cert_doc', 'cert', cert.id, { blobName, evidenceId });
            return (0, http_1.ok)({ evidenceId, uploadUrl, blobName, expiresOn: expiresOn.toISOString() });
        }
        catch (error) {
            context.log('Error issuing staff cert SAS:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('staffUploadCertDoc', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: staffUploadCertDoc,
});
//# sourceMappingURL=staffUploadCertDoc.js.map