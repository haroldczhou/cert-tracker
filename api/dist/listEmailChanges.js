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
exports.listEmailChanges = listEmailChanges;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function listEmailChanges(request, context) {
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
            const status = (_a = url.searchParams.get('status')) !== null && _a !== void 0 ? _a : 'pending'; // pending|verified|approved|rejected|all
            const personId = (_b = url.searchParams.get('personId')) !== null && _b !== void 0 ? _b : undefined;
            let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
            const params = [
                { name: '@t', value: 'emailChange' },
                { name: '@did', value: districtId },
            ];
            if (status !== 'all') {
                q += ' AND c.status = @st';
                params.push({ name: '@st', value: status });
            }
            if (personId) {
                q += ' AND c.personId = @pid';
                params.push({ name: '@pid', value: personId });
            }
            q += ' ORDER BY c.createdAt DESC';
            const items = yield (0, cosmos_1.queryAll)({ query: q, parameters: params });
            return (0, http_1.ok)({ items });
        }
        catch (e) {
            context.log('listEmailChanges error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('listEmailChanges', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: listEmailChanges,
});
//# sourceMappingURL=listEmailChanges.js.map