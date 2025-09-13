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
exports.sendRemindersBulk = sendRemindersBulk;
const functions_1 = require("@azure/functions");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const sendRemindersForPerson_1 = require("./sendRemindersForPerson");
function sendRemindersBulk(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { roles } = userCtx;
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { personIds, status = 'expiring' } = body || {};
            if (!Array.isArray(personIds) || personIds.length === 0)
                return http_1.ERR.VALIDATION('personIds must be a non-empty array');
            const results = [];
            for (const personId of personIds) {
                const res = (yield (0, sendRemindersForPerson_1.sendRemindersForPerson)(Object.assign(Object.assign({}, request), { json: () => __awaiter(this, void 0, void 0, function* () { return ({ personId, status }); }) }), context));
                try {
                    const body = JSON.parse(res.body || '{}');
                    results.push({ personId, ok: res.status === 200, body });
                }
                catch (_a) {
                    results.push({ personId, ok: res.status === 200 });
                }
            }
            return (0, http_1.ok)({ count: results.length, results });
        }
        catch (e) {
            context.log('sendRemindersBulk error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('sendRemindersBulk', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: sendRemindersBulk,
});
//# sourceMappingURL=sendRemindersBulk.js.map