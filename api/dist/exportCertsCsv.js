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
exports.exportCertsCsv = exportCertsCsv;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const auth_1 = require("./utils/auth");
const audit_1 = require("./utils/audit");
const http_1 = require("./utils/http");
function toCsvRow(values) {
    return values
        .map((v) => {
        if (v === null || typeof v === 'undefined')
            return '';
        const s = String(v);
        if (/[",\n]/.test(s))
            return '"' + s.replace(/"/g, '""') + '"';
        return s;
    })
        .join(',');
}
function exportCertsCsv(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const userCtx = (0, auth_1.getUserContext)(request);
            if (!userCtx)
                return { status: 401, body: 'Unauthorized' };
            const { districtId } = userCtx;
            if (!districtId)
                return http_1.ERR.NO_DISTRICT();
            if (request.method !== 'GET')
                return http_1.ERR.METHOD_NOT_ALLOWED();
            if (!(0, auth_1.authorizeRole)(userCtx.roles, ['district_admin', 'school_admin']))
                return http_1.ERR.FORBIDDEN();
            const url = new URL(request.url);
            let schoolId = (_a = url.searchParams.get('schoolId')) !== null && _a !== void 0 ? _a : undefined;
            const personId = (_b = url.searchParams.get('personId')) !== null && _b !== void 0 ? _b : undefined;
            const status = (_c = url.searchParams.get('status')) !== null && _c !== void 0 ? _c : undefined;
            const certTypeKey = (_d = url.searchParams.get('certTypeKey')) !== null && _d !== void 0 ? _d : undefined;
            let cq = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
            const cparams = [
                { name: '@t', value: 'cert' },
                { name: '@did', value: districtId },
            ];
            // If school_admin, force school scope
            if (!userCtx.roles.has('district_admin') && userCtx.roles.has('school_admin')) {
                const profile = yield (0, auth_1.getUserProfile)(districtId, userCtx.userId);
                if (profile === null || profile === void 0 ? void 0 : profile.schoolId)
                    schoolId = profile.schoolId;
            }
            if (schoolId) {
                cq += ' AND c.schoolId = @sid';
                cparams.push({ name: '@sid', value: schoolId });
            }
            if (personId) {
                cq += ' AND c.personId = @pid';
                cparams.push({ name: '@pid', value: personId });
            }
            if (status) {
                cq += ' AND c.status = @st';
                cparams.push({ name: '@st', value: status });
            }
            if (certTypeKey) {
                cq += ' AND c.certTypeKey = @ctk';
                cparams.push({ name: '@ctk', value: certTypeKey });
            }
            cq += ' ORDER BY c.expiryDate ASC';
            const certs = yield (0, cosmos_1.queryAll)({ query: cq, parameters: cparams });
            // Preload people for join
            const people = yield (0, cosmos_1.queryAll)({
                query: 'SELECT c.id, c.fullName, c.email, c.schoolId FROM c WHERE c.type = @t AND c.districtId = @did',
                parameters: [
                    { name: '@t', value: 'person' },
                    { name: '@did', value: districtId },
                ],
            });
            const personById = new Map();
            for (const p of people)
                personById.set(p.id, p);
            const headers = [
                'districtId',
                'schoolId',
                'personId',
                'personName',
                'email',
                'certTypeKey',
                'issueDate',
                'expiryDate',
                'status',
                'docPath',
                'updatedAt',
            ];
            const rows = [toCsvRow(headers)];
            for (const c of certs) {
                const p = personById.get(c.personId) || {};
                rows.push(toCsvRow([
                    c.districtId,
                    (_f = (_e = c.schoolId) !== null && _e !== void 0 ? _e : p.schoolId) !== null && _f !== void 0 ? _f : '',
                    c.personId,
                    (_g = p.fullName) !== null && _g !== void 0 ? _g : '',
                    (_h = p.email) !== null && _h !== void 0 ? _h : '',
                    c.certTypeKey,
                    (_j = c.issueDate) !== null && _j !== void 0 ? _j : '',
                    (_k = c.expiryDate) !== null && _k !== void 0 ? _k : '',
                    (_l = c.status) !== null && _l !== void 0 ? _l : '',
                    (_m = c.docPath) !== null && _m !== void 0 ? _m : '',
                    (_o = c.updatedAt) !== null && _o !== void 0 ? _o : '',
                ]));
            }
            const csv = rows.join('\n');
            const filename = `certs_${districtId}_${new Date().toISOString().slice(0, 10)}.csv`;
            yield (0, audit_1.auditLog)(districtId, userCtx.userId, 'export_csv', 'cert', '*', { count: certs.length, schoolId: schoolId !== null && schoolId !== void 0 ? schoolId : null });
            return {
                status: 200,
                headers: {
                    'content-type': 'text/csv',
                    'content-disposition': `attachment; filename="${filename}"`,
                },
                body: csv,
            };
        }
        catch (error) {
            context.log('Error exporting certs CSV:', error);
            return http_1.ERR.INTERNAL();
        }
    });
}
functions_1.app.http('exportCertsCsv', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: exportCertsCsv,
});
//# sourceMappingURL=exportCertsCsv.js.map