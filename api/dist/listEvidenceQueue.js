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
exports.listEvidenceQueue = listEvidenceQueue;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function listEvidenceQueue(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles, userId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'GET')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const url = new URL(request.url);
            let schoolId = (_a = url.searchParams.get('schoolId')) !== null && _a !== void 0 ? _a : undefined;
            const status = (_b = url.searchParams.get('status')) !== null && _b !== void 0 ? _b : 'pending'; // pending|complete|approved|rejected|all
            if (!roles.has('district_admin') && roles.has('school_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(districtId, userId);
                if (profile === null || profile === void 0 ? void 0 : profile.schoolId)
                    schoolId = profile.schoolId;
            }
            let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
            const params = [
                { name: '@t', value: 'certEvidence' },
                { name: '@did', value: districtId },
            ];
            if (schoolId) {
                q += ' AND c.schoolId = @sid';
                params.push({ name: '@sid', value: schoolId });
            }
            if (status && status !== 'all') {
                q += ' AND c.status = @st';
                params.push({ name: '@st', value: status });
            }
            q += ' ORDER BY c.uploadedAt DESC';
            const evidence = yield (0, cosmos_1.queryAll)({ query: q, parameters: params });
            return (0, http_1.ok)({ items: evidence });
        }
        catch (e) {
            context.log('Error listing evidence queue', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('listEvidenceQueue', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: listEvidenceQueue,
});
//# sourceMappingURL=listEvidenceQueue.js.map