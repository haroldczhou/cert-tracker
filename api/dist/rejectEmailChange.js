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
exports.rejectEmailChange = rejectEmailChange;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function rejectEmailChange(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { requestId, reason } = body || {};
            if (!requestId)
                return http_1.ERR.VALIDATION('requestId is required', { required: ['requestId'] });
            const reqs = yield (0, cosmos_1.queryAll)({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did', parameters: [{ name: '@t', value: 'emailChange' }, { name: '@id', value: requestId }, { name: '@did', value: districtId }] });
            if (reqs.length === 0)
                return http_1.ERR.NOT_FOUND('Request not found');
            const reqDoc = reqs[0];
            if (reqDoc.status !== 'pending')
                return http_1.ERR.CONFLICT('Request already processed');
            reqDoc.status = 'rejected';
            reqDoc.rejectionReason = reason !== null && reason !== void 0 ? reason : null;
            reqDoc.updatedAt = new Date().toISOString();
            yield cosmos_1.entities.items.upsert(reqDoc);
            return (0, http_1.ok)({ rejected: true });
        }
        catch (e) {
            context.log('rejectEmailChange error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('rejectEmailChange', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: rejectEmailChange,
});
//# sourceMappingURL=rejectEmailChange.js.map