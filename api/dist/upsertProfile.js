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
exports.upsertProfile = upsertProfile;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const audit_1 = require("./utils/audit");
const http_1 = require("./utils/http");
function upsertProfile(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, userId, userEmail, userName, roles } = userCtx;
            if (!districtId || !userId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json().catch(() => ({})));
            const incomingSchoolId = body === null || body === void 0 ? void 0 : body.schoolId;
            const incomingRoleKey = body === null || body === void 0 ? void 0 : body.roleKey;
            // Load existing profile
            const existing = yield (0, auth_1.getUserProfile)(districtId, userId);
            // Determine allowed updates
            let roleKey = (existing === null || existing === void 0 ? void 0 : existing.roleKey) || 'staff';
            let schoolId = (existing === null || existing === void 0 ? void 0 : existing.schoolId) || null;
            if (incomingRoleKey && (0, auth_1.authorizeRole)(roles, ['district_admin'])) {
                roleKey = incomingRoleKey;
            }
            if (incomingSchoolId && (roles.has('district_admin') || roles.has('school_admin'))) {
                // school_admin can only set their own school
                if (roles.has('school_admin')) {
                    const adminProfile = yield (0, auth_1.getUserProfile)(districtId, userId);
                    if ((adminProfile === null || adminProfile === void 0 ? void 0 : adminProfile.schoolId) !== incomingSchoolId) {
                        return http_1.ERR.FORBIDDEN('Forbidden to set different schoolId');
                    }
                }
                schoolId = incomingSchoolId;
            }
            const profileDoc = {
                id: userId,
                type: 'profile',
                districtId,
                schoolId,
                roleKey,
                email: userEmail !== null && userEmail !== void 0 ? userEmail : null,
                name: userName !== null && userName !== void 0 ? userName : null,
                updatedAt: new Date().toISOString(),
                createdAt: (existing === null || existing === void 0 ? void 0 : existing.createdAt) || new Date().toISOString(),
            };
            const { resource } = yield cosmos_1.entities.items.upsert(profileDoc);
            yield (0, audit_1.auditLog)(districtId, userId, existing ? 'profile_update' : 'profile_create', 'profile', userId, { roleKey, schoolId });
            return (0, http_1.ok)(resource);
        }
        catch (error) {
            context.log('Error upserting profile:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('upsertProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: upsertProfile,
});
//# sourceMappingURL=upsertProfile.js.map