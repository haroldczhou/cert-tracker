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
exports.magicUploadFinalizeEvidence = magicUploadFinalizeEvidence;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const http_1 = require("./utils/http");
function magicUploadFinalizeEvidence(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { token, evidenceId, sha256, size, contentType } = body || {};
            if (!token || !evidenceId || !sha256 || !size)
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['token', 'evidenceId', 'sha256', 'size'] });
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
            if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now())
                return http_1.ERR.CONFLICT('Link expired');
            if (link.evidenceId !== evidenceId)
                return http_1.ERR.FORBIDDEN('Evidence does not match link');
            const evidences = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @eid AND c.certId = @cid',
                parameters: [
                    { name: '@t', value: 'certEvidence' },
                    { name: '@eid', value: evidenceId },
                    { name: '@cid', value: link.certId },
                ],
            });
            if (evidences.length === 0)
                return http_1.ERR.NOT_FOUND('Evidence not found');
            const evidence = evidences[0];
            evidence.sha256 = sha256;
            evidence.size = size;
            if (contentType)
                evidence.contentType = contentType;
            evidence.uploadedAt = new Date().toISOString();
            evidence.status = 'complete';
            evidence.updatedAt = new Date().toISOString();
            yield cosmos_1.entities.items.upsert(evidence);
            // Automatically set as current for the cert (proactive teacher update)
            const certs = yield (0, cosmos_1.queryAll)({
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
                yield cosmos_1.entities.items.upsert(cert);
            }
            link.used = true;
            yield cosmos_1.entities.items.upsert(link);
            return (0, http_1.ok)({ evidence });
        }
        catch (e) {
            context.log('Magic upload finalize error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('magicUploadFinalizeEvidence', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: magicUploadFinalizeEvidence,
});
//# sourceMappingURL=magicUploadFinalizeEvidence.js.map