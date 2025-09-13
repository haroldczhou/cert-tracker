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
exports.listCertEvidence = listCertEvidence;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function listCertEvidence(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, userId, roles } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'GET')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const url = new URL(request.url);
            const certId = url.searchParams.get('certId');
            if (!certId)
                return http_1.ERR.VALIDATION('Missing certId');
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
            let allowed = (0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']);
            if (!allowed && roles.has('staff')) {
                const people = yield (0, cosmos_1.queryAll)({
                    query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did AND (c.authUid = @uid OR c.email = @email)',
                    parameters: [
                        { name: '@t', value: 'person' },
                        { name: '@pid', value: cert.personId },
                        { name: '@did', value: districtId },
                        { name: '@uid', value: userId },
                        { name: '@email', value: (_a = userCtx.userEmail) !== null && _a !== void 0 ? _a : '' },
                    ],
                });
                allowed = people.length > 0;
            }
            if (!allowed)
                return http_1.ERR.FORBIDDEN();
            if (roles.has('school_admin') && !roles.has('district_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(districtId, userId);
                if ((profile === null || profile === void 0 ? void 0 : profile.schoolId) && profile.schoolId !== cert.schoolId)
                    return http_1.ERR.FORBIDDEN('Forbidden for this school');
            }
            const evidences = yield (0, cosmos_1.queryAll)({
                query: 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did AND c.certId = @cid ORDER BY c.uploadedAt DESC',
                parameters: [
                    { name: '@t', value: 'certEvidence' },
                    { name: '@did', value: districtId },
                    { name: '@cid', value: certId },
                ],
            });
            return (0, http_1.ok)({ certId, currentEvidenceId: (_b = cert.currentEvidenceId) !== null && _b !== void 0 ? _b : null, evidences });
        }
        catch (error) {
            context.log('Error listing cert evidence:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('listCertEvidence', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: listCertEvidence,
});
//# sourceMappingURL=listCertEvidence.js.map