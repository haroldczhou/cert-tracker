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
exports.importPeopleCsv = importPeopleCsv;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const http_1 = require("./utils/http");
const node_crypto_1 = require("node:crypto");
const csv_1 = require("./utils/csv");
function importPeopleCsv(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return http_1.ERR.UNAUTHORIZED();
            const { districtId, roles } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (!(0, auth_1.authorizeRole)(roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            if (request.method !== 'POST')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            const body = (yield request.json());
            const csv = ((body === null || body === void 0 ? void 0 : body.csv) || '').trim();
            if (!csv)
                return http_1.ERR.VALIDATION('csv is required');
            const { headers, rows } = (0, csv_1.parseCSV)(csv, (body === null || body === void 0 ? void 0 : body.delimiter) || ',');
            if (rows.length === 0)
                return (0, http_1.ok)({ created: 0, skipped: 0, errors: [] });
            const header = headers.map((h) => h.trim().toLowerCase());
            const nameIdx = header.indexOf('fullname');
            const emailIdx = header.indexOf('email');
            const roleIdx = header.indexOf('rolekey');
            const schoolIdx = header.indexOf('schoolname');
            if (nameIdx < 0 || emailIdx < 0 || roleIdx < 0 || schoolIdx < 0)
                return http_1.ERR.VALIDATION('CSV must include columns: fullName,email,roleKey,schoolName');
            let created = 0, skipped = 0;
            const errors = [];
            for (let i = 0; i < rows.length; i++) {
                const cols = rows[i];
                const fullName = ((_a = cols[nameIdx]) !== null && _a !== void 0 ? _a : '').trim();
                const email = ((_b = cols[emailIdx]) !== null && _b !== void 0 ? _b : '').trim();
                const roleKey = ((_c = cols[roleIdx]) !== null && _c !== void 0 ? _c : '').trim();
                const schoolName = ((_d = cols[schoolIdx]) !== null && _d !== void 0 ? _d : '').trim();
                if (!fullName || !email || !roleKey || !schoolName) {
                    skipped++;
                    continue;
                }
                try {
                    const schools = yield (0, cosmos_1.queryAll)({ query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.districtId = @did AND c.name = @n', parameters: [{ name: '@t', value: 'school' }, { name: '@did', value: districtId }, { name: '@n', value: schoolName }] });
                    if (schools.length === 0) {
                        errors.push({ row: i + 1, error: `School '${schoolName}' not found` });
                        skipped++;
                        continue;
                    }
                    const schoolId = schools[0].id;
                    const now = new Date().toISOString();
                    yield cosmos_1.entities.items.create({ id: (0, node_crypto_1.randomUUID)(), type: 'person', districtId, schoolId, roleKey, fullName, email, active: true, createdAt: now, updatedAt: now });
                    created++;
                }
                catch (e) {
                    errors.push({ row: i + 1, error: (e === null || e === void 0 ? void 0 : e.message) || 'create failed' });
                }
            }
            return (0, http_1.ok)({ created, skipped, errors });
        }
        catch (e) {
            context.log('importPeopleCsv error', e);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('importPeopleCsv', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: importPeopleCsv,
});
//# sourceMappingURL=importPeopleCsv.js.map