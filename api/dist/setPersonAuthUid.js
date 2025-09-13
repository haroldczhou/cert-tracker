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
exports.setPersonAuthUid = setPersonAuthUid;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const audit_1 = require("./utils/audit");
const http_1 = require("./utils/http");
function setPersonAuthUid(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles, userId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'POST' && request.method !== 'PATCH')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            const body = (yield request.json());
            const { personId, authUid } = body || {};
            if (!personId || !authUid)
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['personId', 'authUid'] });
            // Load person
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
            // School scope for school_admin
            if (!roles.has('district_admin') && roles.has('school_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(districtId, userId);
                if ((profile === null || profile === void 0 ? void 0 : profile.schoolId) && profile.schoolId !== person.schoolId)
                    return http_1.ERR.FORBIDDEN('Forbidden for this school');
            }
            person.authUid = authUid;
            person.updatedAt = new Date().toISOString();
            const { resource } = yield cosmos_1.entities.items.upsert(person);
            yield (0, audit_1.auditLog)(districtId, userId !== null && userId !== void 0 ? userId : null, 'set_auth_uid', 'person', person.id, {});
            return (0, http_1.ok)(resource);
        }
        catch (error) {
            context.log('Error setting person authUid:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('setPersonAuthUid', {
    methods: ['POST', 'PATCH'],
    authLevel: 'anonymous',
    handler: setPersonAuthUid,
});
//# sourceMappingURL=setPersonAuthUid.js.map