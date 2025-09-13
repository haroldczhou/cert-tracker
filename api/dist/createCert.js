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
exports.createCert = createCert;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const status_1 = require("./utils/status");
const node_crypto_1 = require("node:crypto");
const auth_1 = require("./utils/auth");
const audit_1 = require("./utils/audit");
const http_1 = require("./utils/http");
function createCert(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId: userDistrictId, roles, userId } = userCtx;
            if (!userDistrictId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'POST')
                return { status: 405, body: 'Method not allowed' };
            const body = (yield request.json());
            const { personId, certTypeKey, issueDate, expiryDate, docPath } = body !== null && body !== void 0 ? body : {};
            if (!personId || !certTypeKey || !expiryDate) {
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['personId', 'certTypeKey', 'expiryDate'] });
            }
            // Verify person exists in district
            const people = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 c.id, c.schoolId, c.districtId, c.fullName, c.email FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'person' },
                    { name: '@pid', value: personId },
                    { name: '@did', value: userDistrictId },
                ],
            });
            if (people.length === 0)
                return http_1.ERR.FORBIDDEN('Person not found or access denied');
            const person = people[0];
            // If school_admin, ensure same school
            if (!roles.has('district_admin') && roles.has('school_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(userDistrictId, userId);
                if ((profile === null || profile === void 0 ? void 0 : profile.schoolId) && profile.schoolId !== person.schoolId) {
                    return http_1.ERR.FORBIDDEN('Forbidden for this school');
                }
            }
            const status = (0, status_1.computeStatus)(expiryDate);
            const certDoc = {
                id: (0, node_crypto_1.randomUUID)(),
                type: 'cert',
                districtId: userDistrictId,
                schoolId: person.schoolId,
                personId,
                certTypeKey,
                issueDate: issueDate !== null && issueDate !== void 0 ? issueDate : null,
                expiryDate,
                docPath: docPath !== null && docPath !== void 0 ? docPath : null,
                status,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const { resource } = yield cosmos_1.entities.items.create(certDoc);
            yield (0, audit_1.auditLog)(userDistrictId, userId, 'create', 'cert', certDoc.id, { personId, certTypeKey });
            return (0, http_1.created)(resource);
        }
        catch (error) {
            context.log('Error creating cert:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('createCert', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: createCert,
});
//# sourceMappingURL=createCert.js.map