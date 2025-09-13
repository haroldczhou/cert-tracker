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
exports.getPeople = getPeople;
const functions_1 = require("@azure/functions");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const cosmos_1 = require("./utils/cosmos");
// use shared cosmos utils
function getPeople(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            // Get user info from SWA authentication
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const userDistrictId = userCtx.districtId;
            if (!userDistrictId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(userCtx.roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'GET') {
                return { status: 405, body: 'Method not allowed' };
            }
            const url = new URL(request.url);
            let schoolId = url.searchParams.get('schoolId');
            let q = 'SELECT * FROM c WHERE c.type = @type AND c.districtId = @districtId AND c.active = true';
            const params = [
                { name: '@type', value: 'person' },
                { name: '@districtId', value: userDistrictId },
            ];
            if (!userCtx.roles.has('district_admin') && userCtx.roles.has('school_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(userDistrictId, userCtx.userId);
                if (profile === null || profile === void 0 ? void 0 : profile.schoolId)
                    schoolId = profile.schoolId;
            }
            if (schoolId) {
                q += ' AND c.schoolId = @schoolId';
                params.push({ name: '@schoolId', value: schoolId });
            }
            q += ' ORDER BY c.fullName ASC';
            const people = yield (0, cosmos_1.queryAll)({ query: q, parameters: params });
            return (0, http_1.ok)(people);
        }
        catch (error) {
            context.log('Error getting people:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('getPeople', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getPeople
});
//# sourceMappingURL=getPeople.js.map