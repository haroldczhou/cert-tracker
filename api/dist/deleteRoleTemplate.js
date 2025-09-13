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
exports.deleteRoleTemplate = deleteRoleTemplate;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function deleteRoleTemplate(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'DELETE')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin']))
                return http_1.ERR.FORBIDDEN();
            const url = new URL(request.url);
            const roleKey = url.searchParams.get('roleKey');
            if (!roleKey)
                return http_1.ERR.VALIDATION('Missing roleKey');
            const id = `role:${districtId}:${roleKey}`;
            yield cosmos_1.entities.item(id, districtId).delete();
            return (0, http_1.ok)({ id, deleted: true });
        }
        catch (error) {
            context.log('Error deleting role template:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('deleteRoleTemplate', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: deleteRoleTemplate,
});
//# sourceMappingURL=deleteRoleTemplate.js.map