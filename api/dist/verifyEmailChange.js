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
exports.verifyEmailChange = verifyEmailChange;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const http_1 = require("./utils/http");
function verifyEmailChange(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (request.method !== 'POST' && request.method !== 'GET')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const url = new URL(request.url);
            let token = null;
            if (request.method === 'GET') {
                token = url.searchParams.get('token');
            }
            else {
                try {
                    const body = (yield request.json());
                    token = (_a = body === null || body === void 0 ? void 0 : body.token) !== null && _a !== void 0 ? _a : null;
                }
                catch (_b) {
                    token = null;
                }
            }
            if (!token)
                return http_1.ERR.VALIDATION('token is required', { required: ['token'] });
            const reqs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.verificationToken = @tok',
                parameters: [
                    { name: '@t', value: 'emailChange' },
                    { name: '@tok', value: token },
                ],
            });
            if (reqs.length === 0)
                return http_1.ERR.NOT_FOUND('Invalid token');
            const reqDoc = reqs[0];
            if (reqDoc.status !== 'pending')
                return http_1.ERR.CONFLICT('Request already processed');
            if (reqDoc.verificationExpiresAt && new Date(reqDoc.verificationExpiresAt).getTime() < Date.now())
                return http_1.ERR.CONFLICT('Token expired');
            reqDoc.status = 'verified';
            reqDoc.verifiedAt = new Date().toISOString();
            yield cosmos_1.entities.items.upsert(reqDoc);
            return (0, http_1.ok)({ verified: true });
        }
        catch (e) {
            context.log('verifyEmailChange error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('verifyEmailChange', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: verifyEmailChange,
});
//# sourceMappingURL=verifyEmailChange.js.map