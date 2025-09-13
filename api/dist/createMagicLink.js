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
exports.createMagicLink = createMagicLink;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const node_crypto_1 = require("node:crypto");
const http_1 = require("./utils/http");
function createMagicLink(request, context) {
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
            const { certId, expiresInMinutes = 60 * 24 } = body || {};
            if (!certId)
                return http_1.ERR.VALIDATION('certId is required', { required: ['certId'] });
            const certs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'cert' },
                    { name: '@cid', value: certId },
                    { name: '@did', value: districtId },
                ],
            });
            if (certs.length === 0)
                return http_1.ERR.NOT_FOUND('Cert not found');
            const cert = certs[0];
            if (roles.has('school_admin') && !roles.has('district_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(districtId, userId);
                if ((profile === null || profile === void 0 ? void 0 : profile.schoolId) && profile.schoolId !== cert.schoolId)
                    return http_1.ERR.FORBIDDEN('Forbidden for this school');
            }
            const id = (0, node_crypto_1.randomUUID)();
            const now = Date.now();
            const expiresAt = new Date(now + expiresInMinutes * 60 * 1000).toISOString();
            const doc = {
                id,
                type: 'magicLink',
                districtId,
                certId: cert.id,
                personId: cert.personId,
                expiresAt,
                used: false,
                evidenceId: null,
                createdAt: new Date(now).toISOString(),
                createdByUid: userId !== null && userId !== void 0 ? userId : null,
            };
            yield cosmos_1.entities.items.create(doc);
            const base = process.env.PUBLIC_BASE_URL || '';
            const link = base ? `${base}/magic-upload?token=${id}` : undefined;
            return (0, http_1.ok)({ token: id, expiresAt, link });
        }
        catch (e) {
            context.log('Error creating magic link', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('createMagicLink', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: createMagicLink,
});
//# sourceMappingURL=createMagicLink.js.map