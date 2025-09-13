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
exports.requestEmailChange = requestEmailChange;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const communication_email_1 = require("@azure/communication-email");
function requestEmailChange(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, userId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { newEmail, personId } = body || {};
            if (!newEmail)
                return http_1.ERR.VALIDATION('newEmail is required', { required: ['newEmail'] });
            // resolve person
            let p = null;
            if (personId) {
                const res = yield (0, cosmos_1.queryAll)({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did', parameters: [{ name: '@t', value: 'person' }, { name: '@id', value: personId }, { name: '@did', value: districtId }] });
                p = (_a = res[0]) !== null && _a !== void 0 ? _a : null;
            }
            else {
                const res = yield (0, cosmos_1.queryAll)({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.districtId = @did AND (c.authUid = @uid OR c.email = @email)', parameters: [{ name: '@t', value: 'person' }, { name: '@did', value: districtId }, { name: '@uid', value: userId }, { name: '@email', value: (_b = userCtx.userEmail) !== null && _b !== void 0 ? _b : '' }] });
                p = (_c = res[0]) !== null && _c !== void 0 ? _c : null;
            }
            if (!p)
                return http_1.ERR.NOT_FOUND('Person not found');
            const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const doc = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                type: 'emailChange',
                districtId,
                personId: p.id,
                newEmail,
                status: 'pending',
                verificationToken: token,
                verificationExpiresAt: expiresAt,
                requestedByUid: userId !== null && userId !== void 0 ? userId : null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            yield cosmos_1.entities.items.create(doc);
            // Send verification email to newEmail
            const base = process.env.PUBLIC_BASE_URL || '';
            const link = base ? `${base}/email-verify?token=${encodeURIComponent(token)}` : undefined;
            const ACS = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
            const FROM = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
            if (ACS && FROM && link) {
                try {
                    const client = new communication_email_1.EmailClient(ACS);
                    yield client.beginSend({
                        senderAddress: FROM,
                        recipients: { to: [{ address: newEmail }] },
                        content: { subject: 'Verify your email change', html: `<p>Please verify your email change by clicking the link:</p><p><a href="${link}">${link}</a></p>` },
                    });
                }
                catch (_d) { }
            }
            return (0, http_1.ok)({ requestId: doc.id, status: 'pending', verificationSent: !!(ACS && FROM && link) });
        }
        catch (e) {
            context.log('requestEmailChange error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('requestEmailChange', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: requestEmailChange,
});
//# sourceMappingURL=requestEmailChange.js.map