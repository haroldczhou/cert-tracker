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
exports.getCerts = getCerts;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function getCerts(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
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
            if (request.method !== 'GET')
                return { status: 405, body: 'Method not allowed' };
            const url = new URL(request.url);
            const id = (_a = url.searchParams.get('id')) !== null && _a !== void 0 ? _a : undefined;
            let schoolId = (_b = url.searchParams.get('schoolId')) !== null && _b !== void 0 ? _b : undefined;
            const personId = (_c = url.searchParams.get('personId')) !== null && _c !== void 0 ? _c : undefined;
            const certTypeKey = (_d = url.searchParams.get('certTypeKey')) !== null && _d !== void 0 ? _d : undefined;
            const status = (_e = url.searchParams.get('status')) !== null && _e !== void 0 ? _e : undefined; // valid | expiring | expired
            const expiringWithinDays = url.searchParams.get('expiringWithinDays');
            let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
            const params = [
                { name: '@t', value: 'cert' },
                { name: '@did', value: userDistrictId },
            ];
            // If school_admin, force school scope
            if (!userCtx.roles.has('district_admin') && userCtx.roles.has('school_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(userDistrictId, userCtx.userId);
                if (profile === null || profile === void 0 ? void 0 : profile.schoolId) {
                    schoolId = profile.schoolId;
                }
            }
            if (id) {
                q += ' AND c.id = @id';
                params.push({ name: '@id', value: id });
            }
            if (schoolId) {
                q += ' AND c.schoolId = @sid';
                params.push({ name: '@sid', value: schoolId });
            }
            if (personId) {
                q += ' AND c.personId = @pid';
                params.push({ name: '@pid', value: personId });
            }
            if (certTypeKey) {
                q += ' AND c.certTypeKey = @ctk';
                params.push({ name: '@ctk', value: certTypeKey });
            }
            if (status) {
                q += ' AND c.status = @st';
                params.push({ name: '@st', value: status });
            }
            if (expiringWithinDays) {
                const days = parseInt(expiringWithinDays, 10);
                if (!Number.isNaN(days) && days >= 0) {
                    const nowIso = new Date().toISOString();
                    const upper = new Date();
                    upper.setUTCDate(upper.getUTCDate() + days);
                    const upperIso = upper.toISOString();
                    q += ' AND c.expiryDate >= @now AND c.expiryDate < @upper';
                    params.push({ name: '@now', value: nowIso }, { name: '@upper', value: upperIso });
                }
            }
            q += ' ORDER BY c.expiryDate ASC';
            const certs = yield (0, cosmos_1.queryAll)({ query: q, parameters: params });
            return (0, http_1.ok)(certs);
        }
        catch (error) {
            context.log('Error getting certs:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('getCerts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getCerts,
});
//# sourceMappingURL=getCerts.js.map