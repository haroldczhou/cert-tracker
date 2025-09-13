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
exports.createSchool = createSchool;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const node_crypto_1 = require("node:crypto");
function createSchool(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin']))
                return http_1.ERR.FORBIDDEN();
            const body = (yield request.json());
            const { name } = body || {};
            if (!name)
                return http_1.ERR.VALIDATION('Missing required fields', { required: ['name'] });
            const now = new Date().toISOString();
            const doc = {
                id: (0, node_crypto_1.randomUUID)(),
                type: 'school',
                districtId,
                name,
                active: true,
                createdAt: now,
                updatedAt: now,
            };
            const { resource } = yield cosmos_1.entities.items.create(doc);
            return (0, http_1.created)(resource);
        }
        catch (e) {
            context.log('Error creating school', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('createSchool', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: createSchool,
});
//# sourceMappingURL=createSchool.js.map