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
exports.approveEvidence = approveEvidence;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const audit_1 = require("./utils/audit");
function approveEvidence(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles, userId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            const body = (yield request.json());
            const { certId, evidenceId } = body || {};
            if (!certId || !evidenceId)
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['certId', 'evidenceId'] });
            const certs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'cert' },
                    { name: '@cid', value: certId },
                    { name: '@did', value: districtId },
                ],
            });
            if (certs.length === 0)
                return http_1.ERR.NOT_FOUND('Cert not found');
            const cert = certs[0];
            if (roles.has('school_admin') && !roles.has('district_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(districtId, userId);
                if ((profile === null || profile === void 0 ? void 0 : profile.schoolId) && profile.schoolId !== cert.schoolId)
                    return http_1.ERR.FORBIDDEN('Forbidden for this school');
            }
            const evidences = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @eid AND c.districtId = @did AND c.certId = @cid',
                parameters: [
                    { name: '@t', value: 'certEvidence' },
                    { name: '@eid', value: evidenceId },
                    { name: '@did', value: districtId },
                    { name: '@cid', value: certId },
                ],
            });
            if (evidences.length === 0)
                return http_1.ERR.NOT_FOUND('Evidence not found');
            const evidence = evidences[0];
            if (evidence.status !== 'complete')
                return http_1.ERR.CONFLICT('Evidence is not complete');
            evidence.status = 'approved';
            evidence.approvedAt = new Date().toISOString();
            evidence.updatedAt = new Date().toISOString();
            yield cosmos_1.entities.items.upsert(evidence);
            cert.currentEvidenceId = evidence.id;
            cert.updatedAt = new Date().toISOString();
            const { resource } = yield cosmos_1.entities.items.upsert(cert);
            yield (0, audit_1.auditLog)(districtId, userId !== null && userId !== void 0 ? userId : null, 'approve_evidence', 'cert', cert.id, { evidenceId });
            return (0, http_1.ok)(resource);
        }
        catch (e) {
            context.log('Approve evidence error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('approveEvidence', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: approveEvidence,
});
//# sourceMappingURL=approveEvidence.js.map