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
exports.getUserContext = getUserContext;
exports.authorizeRole = authorizeRole;
exports.getUserProfile = getUserProfile;
const cosmos_1 = require("./cosmos");
function getUserContext(request) {
    var _a, _b, _c, _d;
    const cp = request.headers.get('x-ms-client-principal');
    if (!cp)
        return null;
    const user = JSON.parse(Buffer.from(cp, 'base64').toString());
    const claims = user.claims || [];
    let districtId = ((_a = claims.find((c) => c.typ === 'extension_districtId')) === null || _a === void 0 ? void 0 : _a.val) || null;
    if (!districtId && process.env.DEV_DEFAULT_DISTRICT_ID) {
        districtId = process.env.DEV_DEFAULT_DISTRICT_ID;
    }
    const userId = user.userId ||
        ((_b = claims.find((c) => c.typ.endsWith('/nameidentifier') || c.typ.endsWith('/objectidentifier'))) === null || _b === void 0 ? void 0 : _b.val) ||
        null;
    const userEmail = user.userDetails || ((_c = claims.find((c) => c.typ.toLowerCase().includes('email'))) === null || _c === void 0 ? void 0 : _c.val) || null;
    const userName = ((_d = claims.find((c) => c.typ.toLowerCase().includes('name'))) === null || _d === void 0 ? void 0 : _d.val) || null;
    const roles = new Set();
    for (const c of claims) {
        if (c.typ === 'roles' ||
            c.typ === 'extension_roles' ||
            c.typ === 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role') {
            for (const r of c.val.split(/[;,\s]+/).filter(Boolean))
                roles.add(r);
        }
    }
    return { districtId, roles, userId, userEmail, userName, raw: user };
}
function authorizeRole(roles, allowed) {
    // Strict: must intersect with allowed
    if (roles.has('district_admin'))
        return true;
    return allowed.some((r) => roles.has(r));
}
function getUserProfile(districtId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!userId)
            return null;
        const res = yield (0, cosmos_1.queryAll)({
            query: 'SELECT TOP 1 c.id, c.schoolId, c.roleKey FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
            parameters: [
                { name: '@t', value: 'profile' },
                { name: '@id', value: userId },
                { name: '@did', value: districtId },
            ],
        });
        return (_a = res[0]) !== null && _a !== void 0 ? _a : null;
    });
}
//# sourceMappingURL=auth.js.map