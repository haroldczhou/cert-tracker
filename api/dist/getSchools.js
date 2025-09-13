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
exports.getSchools = getSchools;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function getSchools(request, context) {
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
            if (request.method !== 'GET')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const schools = yield (0, cosmos_1.queryAll)({
                query: 'SELECT * FROM c WHERE c.type = @type AND c.districtId = @districtId ORDER BY c.name ASC',
                parameters: [
                    { name: '@type', value: 'school' },
                    { name: '@districtId', value: userDistrictId },
                ],
            });
            return (0, http_1.ok)(schools);
        }
        catch (error) {
            context.log('Error getting schools:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('getSchools', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getSchools
});
//# sourceMappingURL=getSchools.js.map