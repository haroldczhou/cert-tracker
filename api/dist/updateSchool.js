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
exports.updateSchool = updateSchool;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function updateSchool(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'PATCH' && request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin']))
                return http_1.ERR.FORBIDDEN();
            const url = new URL(request.url);
            const id = url.searchParams.get('id');
            if (!id)
                return http_1.ERR.VALIDATION('Missing id', { required: ['id'] });
            const body = (yield request.json());
            const docs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'school' },
                    { name: '@id', value: id },
                    { name: '@did', value: districtId },
                ],
            });
            if (docs.length === 0)
                return http_1.ERR.NOT_FOUND('School not found');
            const school = docs[0];
            if (typeof body.name !== 'undefined')
                school.name = body.name;
            if (typeof body.active !== 'undefined')
                school.active = body.active;
            school.updatedAt = new Date().toISOString();
            const { resource } = yield cosmos_1.entities.items.upsert(school);
            return (0, http_1.ok)(resource);
        }
        catch (e) {
            context.log('Error updating school', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('updateSchool', {
    methods: ['PATCH', 'POST'],
    authLevel: 'anonymous',
    handler: updateSchool,
});
//# sourceMappingURL=updateSchool.js.map