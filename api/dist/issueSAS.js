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
exports.issueSAS = issueSAS;
const functions_1 = require("@azure/functions");
const storage_blob_1 = require("@azure/storage-blob");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function issueSAS(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const userDistrictId = userCtx.districtId;
            if (!userDistrictId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(userCtx.roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = yield request.json();
            const { fileName, contentType } = body;
            if (!fileName)
                return http_1.ERR.VALIDATION('fileName is required', { required: ['fileName'] });
            // Validate file extension (basic security)
            const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
            const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
            if (!allowedExtensions.includes(fileExt)) {
                return http_1.ERR.VALIDATION('File type not allowed', { allowed: allowedExtensions });
            }
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
            const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
            const containerName = 'certs';
            const credential = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
            // Generate a unique blob name with district scoping
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 9);
            const blobName = `${userDistrictId}/${timestamp}_${randomId}_${fileName}`;
            // Create SAS token valid for 15 minutes
            const expiresOn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            const sasOptions = {
                containerName,
                blobName,
                permissions: storage_blob_1.BlobSASPermissions.parse('w'), // Write only
                expiresOn,
                contentType: contentType || 'application/octet-stream'
            };
            const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)(sasOptions, credential).toString();
            const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
            return (0, http_1.ok)({ uploadUrl, blobName, expiresOn: expiresOn.toISOString() });
        }
        catch (error) {
            context.log('Error issuing SAS token:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('issueSAS', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: issueSAS
});
//# sourceMappingURL=issueSAS.js.map