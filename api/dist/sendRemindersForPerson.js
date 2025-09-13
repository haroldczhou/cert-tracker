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
exports.sendRemindersForPerson = sendRemindersForPerson;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const communication_email_1 = require("@azure/communication-email");
function sendRemindersForPerson(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles, userId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { personId, status = 'expiring' } = body || {};
            if (!personId)
                return http_1.ERR.VALIDATION('personId is required', { required: ['personId'] });
            const people = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'person' },
                    { name: '@pid', value: personId },
                    { name: '@did', value: districtId },
                ],
            });
            if (people.length === 0)
                return http_1.ERR.NOT_FOUND('Person not found');
            const person = people[0];
            if (roles.has('school_admin') && !roles.has('district_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(districtId, userId);
                if ((profile === null || profile === void 0 ? void 0 : profile.schoolId) && profile.schoolId !== person.schoolId)
                    return http_1.ERR.FORBIDDEN('Forbidden for this school');
            }
            let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did AND c.personId = @pid';
            const params = [
                { name: '@t', value: 'cert' },
                { name: '@did', value: districtId },
                { name: '@pid', value: personId },
            ];
            if (status !== 'all') {
                q += ' AND c.status = @st';
                params.push({ name: '@st', value: status });
            }
            const certs = yield (0, cosmos_1.queryAll)({ query: q, parameters: params });
            const results = [];
            const base = process.env.PUBLIC_BASE_URL || '';
            const ACS = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
            const FROM = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
            const client = ACS && FROM ? new communication_email_1.EmailClient(ACS) : null;
            for (const cert of certs) {
                try {
                    // create magic link doc
                    const id = crypto.randomUUID();
                    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    const doc = {
                        id,
                        type: 'magicLink',
                        districtId,
                        certId: cert.id,
                        personId: person.id,
                        expiresAt,
                        used: false,
                        evidenceId: null,
                        createdAt: new Date().toISOString(),
                        createdByUid: userId !== null && userId !== void 0 ? userId : null,
                    };
                    yield cosmos_1.entities.items.create(doc);
                    const link = base ? `${base}/magic-upload?token=${id}` : undefined;
                    if (client && FROM) {
                        const subject = 'Certification Update Request';
                        const html = [`<p>Hello ${person.fullName},</p>`, `<p>Please upload your latest evidence for ${cert.certTypeKey}.</p>`, link ? `<p>Upload link (24h): <a href="${link}">${link}</a></p>` : ''].join('');
                        yield client.beginSend({ senderAddress: FROM, recipients: { to: [{ address: person.email }] }, content: { subject, html } });
                    }
                    results.push({ certId: cert.id, status: 'sent' });
                }
                catch (e) {
                    results.push({ certId: cert.id, status: 'skipped', reason: (e === null || e === void 0 ? void 0 : e.message) || 'error' });
                }
            }
            return (0, http_1.ok)({ count: results.length, results });
        }
        catch (e) {
            context.log('sendRemindersForPerson error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('sendRemindersForPerson', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: sendRemindersForPerson,
});
//# sourceMappingURL=sendRemindersForPerson.js.map