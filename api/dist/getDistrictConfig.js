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
exports.getDistrictConfig = getDistrictConfig;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
function getDistrictConfig(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'GET')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const docs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'config' },
                    { name: '@id', value: `config:${districtId}` },
                    { name: '@did', value: districtId },
                ],
            });
            const defaults = { reminderOffsets: [60, 30, 7, 1, 0], expiringThresholdDays: 30 };
            const cfg = (_a = docs[0]) !== null && _a !== void 0 ? _a : Object.assign({ id: `config:${districtId}`, type: 'config', districtId }, defaults);
            return (0, http_1.ok)(cfg);
        }
        catch (error) {
            context.log('Error getting district config:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('getDistrictConfig', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getDistrictConfig,
});
//# sourceMappingURL=getDistrictConfig.js.map