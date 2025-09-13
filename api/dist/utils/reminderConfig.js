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
exports.queryDistrictConfig = queryDistrictConfig;
const cosmos_1 = require("./cosmos");
const cache = new Map();
function queryDistrictConfig(districtId, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (cache.has(districtId))
            return cache.get(districtId);
        try {
            const docs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'config' },
                    { name: '@id', value: `config:${districtId}` },
                    { name: '@did', value: districtId },
                ],
            });
            const cfg = (_a = docs[0]) !== null && _a !== void 0 ? _a : null;
            cache.set(districtId, cfg);
            return cfg;
        }
        catch (e) {
            (_b = context === null || context === void 0 ? void 0 : context.log) === null || _b === void 0 ? void 0 : _b.call(context, 'Failed to load district config', e);
            cache.set(districtId, null);
            return null;
        }
    });
}
//# sourceMappingURL=reminderConfig.js.map