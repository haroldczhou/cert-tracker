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
exports.magicUploadCreateEvidence = magicUploadCreateEvidence;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const http_1 = require("./utils/http");
const storage_blob_1 = require("@azure/storage-blob");
function magicUploadCreateEvidence(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { token, fileName, contentType } = body || {};
            if (!token || !fileName)
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['token', 'fileName'] });
            const links = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id',
                parameters: [
                    { name: '@t', value: 'magicLink' },
                    { name: '@id', value: token },
                ],
            });
            if (links.length === 0)
                return http_1.ERR.NOT_FOUND('Invalid link');
            const link = links[0];
            if (link.used)
                return http_1.ERR.CONFLICT('Link already used');
            if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now())
                return http_1.ERR.CONFLICT('Link expired');
            if (link.evidenceId)
                return http_1.ERR.CONFLICT('Evidence already created for this link');
            const certs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid',
                parameters: [
                    { name: '@t', value: 'cert' },
                    { name: '@cid', value: link.certId },
                ],
            });
            if (certs.length === 0)
                return http_1.ERR.NOT_FOUND('Cert not found');
            const cert = certs[0];
            const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
            const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
            if (!allowedExtensions.includes(ext))
                return http_1.ERR.VALIDATION('File type not allowed', { allowed: allowedExtensions });
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
            const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
            const containerName = 'certs';
            const credential = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
            const evidenceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const blobName = `${cert.districtId}/${cert.personId}/${cert.id}/${evidenceId}_${fileName}`;
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
                districtId: cert.districtId,
                certId: cert.id,
                personId: cert.personId,
                schoolId: (_a = cert.schoolId) !== null && _a !== void 0 ? _a : null,
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
            yield cosmos_1.entities.items.create(evidenceDoc);
            link.evidenceId = evidenceId;
            yield cosmos_1.entities.items.upsert(link);
            return (0, http_1.ok)({ evidenceId, uploadUrl, blobName, expiresOn: expiresOn.toISOString() });
        }
        catch (e) {
            context.log('Magic upload create error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('magicUploadCreateEvidence', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: magicUploadCreateEvidence,
});
//# sourceMappingURL=magicUploadCreateEvidence.js.map