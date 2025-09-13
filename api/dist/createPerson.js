"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.createPerson = createPerson;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const audit_1 = require("./utils/audit");
const http_1 = require("./utils/http");
const node_crypto_1 = require("node:crypto");
function createPerson(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
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
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const { fullName, email, roleKey, schoolId, sendInvite, certIdForUpload } = body;
            if (!fullName || !email || !roleKey || !schoolId) {
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['fullName', 'email', 'roleKey', 'schoolId'] });
            }
            // Verify the school belongs to the user's district
            const schoolQuery = {
                query: 'SELECT * FROM c WHERE c.type = @type AND c.id = @schoolId AND c.districtId = @districtId',
                parameters: [
                    { name: '@type', value: 'school' },
                    { name: '@schoolId', value: schoolId },
                    { name: '@districtId', value: userDistrictId }
                ]
            };
            const { resources: schools } = yield cosmos_1.entities.items.query(schoolQuery).fetchAll();
            if (schools.length === 0) {
                return http_1.ERR.FORBIDDEN('School not found or access denied');
            }
            const nowIso = new Date().toISOString();
            const personId = (0, node_crypto_1.randomUUID)();
            const person = {
                id: personId,
                type: 'person',
                districtId: userDistrictId,
                schoolId,
                roleKey,
                fullName,
                email,
                active: true,
                createdAt: nowIso,
                updatedAt: nowIso
            };
            const { resource: createdPerson } = yield cosmos_1.entities.items.create(person);
            yield (0, audit_1.auditLog)(userDistrictId, (_a = userCtx.userId) !== null && _a !== void 0 ? _a : null, 'create', 'person', personId, { fullName, email, roleKey, schoolId });
            // Optional: send invite email (SWA login + optional magic link for a cert upload)
            if (sendInvite) {
                try {
                    const base = process.env.PUBLIC_BASE_URL || '';
                    const loginUrl = base ? `${base}/.auth/login/aad?post_login_redirect_uri=/dashboard` : undefined;
                    let magicUrl;
                    if (certIdForUpload) {
                        const res = yield fetch(new URL(request.url).origin + '/api/createMagicLink', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-ms-client-principal': request.headers.get('x-ms-client-principal') || '' },
                            body: JSON.stringify({ certId: certIdForUpload, expiresInMinutes: 60 * 24 }),
                        });
                        if (res.ok) {
                            const data = yield res.json();
                            magicUrl = data.link;
                        }
                    }
                    const lines = [
                        `Hello ${fullName},`,
                        `An account has been created for you in the Certification Tracker.`,
                        loginUrl ? `Login: ${loginUrl}` : '',
                        magicUrl ? `Upload your certification evidence: ${magicUrl}` : '',
                    ].filter(Boolean);
                    // Best-effort; ignore failures
                    try {
                        const { sendEmail } = yield Promise.resolve().then(() => __importStar(require('./utils/email')));
                        yield sendEmail(email, 'Your Certification Tracker access', lines.map((l) => `<p>${l}</p>`).join(''));
                    }
                    catch (_b) { }
                }
                catch (_c) { }
            }
            return (0, http_1.created)(createdPerson);
        }
        catch (error) {
            context.log('Error creating person:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('createPerson', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: createPerson
});
//# sourceMappingURL=createPerson.js.map