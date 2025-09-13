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
exports.devSeedOptionA = devSeedOptionA;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
function devSeedOptionA(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Guard: only allow in dev via env flag
            if (process.env.DEV_ENABLE_SEED !== '1') {
                return { status: 403, body: 'Seeding disabled' };
            }
            const districtId = process.env.DEV_DEFAULT_DISTRICT_ID || 'district-001';
            const now = new Date().toISOString();
            // Ensure school
            const schoolName = 'Lincoln Elementary';
            let schools = yield (0, cosmos_1.queryAll)({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.districtId = @d AND c.name = @n', parameters: [{ name: '@t', value: 'school' }, { name: '@d', value: districtId }, { name: '@n', value: schoolName }] });
            let school = schools[0];
            if (!school) {
                const { resource } = yield cosmos_1.entities.items.create({ id: crypto.randomUUID(), type: 'school', districtId, name: schoolName, active: true, createdAt: now, updatedAt: now });
                school = resource;
            }
            // Ensure person
            const personEmail = 'jane.teacher@example.org';
            let people = yield (0, cosmos_1.queryAll)({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.districtId = @d AND c.email = @e', parameters: [{ name: '@t', value: 'person' }, { name: '@d', value: districtId }, { name: '@e', value: personEmail }] });
            let person = people[0];
            if (!person) {
                const { resource } = yield cosmos_1.entities.items.create({ id: crypto.randomUUID(), type: 'person', districtId, schoolId: school.id, roleKey: 'teacher', fullName: 'Jane Teacher', email: personEmail, active: true, createdAt: now, updatedAt: now });
                person = resource;
            }
            // Create cert
            const expiry = new Date();
            expiry.setUTCDate(expiry.getUTCDate() + 20);
            const cert = { id: crypto.randomUUID(), type: 'cert', districtId, schoolId: school.id, personId: person.id, certTypeKey: 'cert-cpr', issueDate: null, expiryDate: expiry.toISOString(), status: 'expiring', createdAt: now, updatedAt: now };
            yield cosmos_1.entities.items.create(cert);
            return { status: 200, body: JSON.stringify({ districtId, school, person, cert }) };
        }
        catch (e) {
            context.log('devSeedOptionA error', e);
            return { status: 500, body: JSON.stringify({ error: (e === null || e === void 0 ? void 0 : e.message) || 'seed error' }) };
        }
    });
}
functions_1.app.http('devSeedOptionA', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    handler: devSeedOptionA,
});
//# sourceMappingURL=devSeedOptionA.js.map