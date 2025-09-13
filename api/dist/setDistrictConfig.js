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
exports.setDistrictConfig = setDistrictConfig;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function setDistrictConfig(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        context.log(`Http function processed request for url "${request.url}"`);
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
            const cfg = {
                id: `config:${districtId}`,
                type: 'config',
                districtId,
                reminderOffsets: (_a = body.reminderOffsets) !== null && _a !== void 0 ? _a : [60, 30, 7, 1, 0],
                expiringThresholdDays: (_b = body.expiringThresholdDays) !== null && _b !== void 0 ? _b : 30,
                emailFrom: (_c = body.emailFrom) !== null && _c !== void 0 ? _c : null,
                timezone: (_d = body.timezone) !== null && _d !== void 0 ? _d : null,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };
            const { resource } = yield cosmos_1.entities.items.upsert(cfg);
            return (0, http_1.ok)(resource);
        }
        catch (error) {
            context.log('Error setting district config:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('setDistrictConfig', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: setDistrictConfig,
});
//# sourceMappingURL=setDistrictConfig.js.map