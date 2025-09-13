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
exports.resendEmailVerification = resendEmailVerification;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const communication_email_1 = require("@azure/communication-email");
function resendEmailVerification(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { requestId } = body || {};
            if (!requestId)
                return http_1.ERR.VALIDATION('requestId is required', { required: ['requestId'] });
            const reqs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'emailChange' },
                    { name: '@id', value: requestId },
                    { name: '@did', value: districtId },
                ],
            });
            if (reqs.length === 0)
                return http_1.ERR.NOT_FOUND('Request not found');
            const doc = reqs[0];
            if (doc.status !== 'pending')
                return http_1.ERR.CONFLICT('Request is not pending');
            // extend expiry and resend link
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            doc.verificationExpiresAt = expiresAt;
            yield cosmos_1.entities.items.upsert(doc);
            const base = process.env.PUBLIC_BASE_URL || '';
            const link = base ? `${base}/email-verify?token=${encodeURIComponent(doc.verificationToken)}` : undefined;
            const ACS = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
            const FROM = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
            if (ACS && FROM && link) {
                try {
                    const client = new communication_email_1.EmailClient(ACS);
                    yield client.beginSend({
                        senderAddress: FROM,
                        recipients: { to: [{ address: doc.newEmail }] },
                        content: { subject: 'Verify your email change', html: `<p>Please verify your email change by clicking the link:</p><p><a href="${link}">${link}</a></p>` },
                    });
                }
                catch (_a) { }
            }
            return (0, http_1.ok)({ resent: true, expiresAt });
        }
        catch (e) {
            context.log('resendEmailVerification error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('resendEmailVerification', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: resendEmailVerification,
});
//# sourceMappingURL=resendEmailVerification.js.map