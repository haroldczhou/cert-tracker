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
exports.importSchoolsCsv = importSchoolsCsv;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const node_crypto_1 = require("node:crypto");
const csv_1 = require("./utils/csv");
function importSchoolsCsv(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const csv = ((body === null || body === void 0 ? void 0 : body.csv) || '').trim();
            if (!csv)
                return http_1.ERR.VALIDATION('csv is required');
            const { headers, rows } = (0, csv_1.parseCSV)(csv, (body === null || body === void 0 ? void 0 : body.delimiter) || ',');
            if (rows.length === 0)
                return (0, http_1.ok)({ created: 0, skipped: 0 });
            const lower = headers.map((h) => h.toLowerCase());
            const nameIdx = lower.indexOf('name');
            if (nameIdx < 0)
                return http_1.ERR.VALIDATION('Missing "name" column in CSV');
            let created = 0, skipped = 0;
            for (let i = 0; i < rows.length; i++) {
                const cols = rows[i];
                const name = ((_a = cols[nameIdx]) !== null && _a !== void 0 ? _a : '').trim();
                if (!name) {
                    skipped++;
                    continue;
                }
                const dup = yield (0, cosmos_1.queryAll)({
                    query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.districtId = @did AND c.name = @n',
                    parameters: [
                        { name: '@t', value: 'school' },
                        { name: '@did', value: districtId },
                        { name: '@n', value: name },
                    ],
                });
                if (dup.length > 0) {
                    skipped++;
                    continue;
                }
                const now = new Date().toISOString();
                yield cosmos_1.entities.items.create({ id: (0, node_crypto_1.randomUUID)(), type: 'school', districtId, name, active: true, createdAt: now, updatedAt: now });
                created++;
            }
            return (0, http_1.ok)({ created, skipped });
        }
        catch (e) {
            context.log('importSchoolsCsv error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('importSchoolsCsv', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: importSchoolsCsv,
});
//# sourceMappingURL=importSchoolsCsv.js.map