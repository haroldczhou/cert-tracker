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
exports.reminderEngine = reminderEngine;
const functions_1 = require("@azure/functions");
const node_crypto_1 = require("node:crypto");
const cosmos_1 = require("./utils/cosmos");
const status_1 = require("./utils/status");
const email_1 = require("./utils/email");
const reminderConfig_1 = require("./utils/reminderConfig");
const DEFAULT_OFFSETS = [60, 30, 7, 1, 0]; // days before expiry
function reminderEngine(timer, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const now = new Date().toISOString();
        context.log(`Reminder engine tick at ${now}`);
        for (const offset of DEFAULT_OFFSETS) {
            const { start, end } = (0, status_1.dayWindow)(offset);
            const startIso = start.toISOString();
            const endIso = end.toISOString();
            context.log(`Scanning certs expiring between ${startIso} and ${endIso} (T+${offset})`);
            const certs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT c.id, c.type, c.districtId, c.schoolId, c.personId, c.certTypeKey, c.expiryDate FROM c WHERE c.type = @t AND c.expiryDate >= @s AND c.expiryDate < @e',
                parameters: [
                    { name: '@t', value: 'cert' },
                    { name: '@s', value: startIso },
                    { name: '@e', value: endIso },
                ],
            });
            for (const cert of certs) {
                // fetch district config and check if this offset is enabled
                const cfg = yield (0, reminderConfig_1.queryDistrictConfig)(cert.districtId, context);
                const offsets = (_a = cfg === null || cfg === void 0 ? void 0 : cfg.reminderOffsets) !== null && _a !== void 0 ? _a : DEFAULT_OFFSETS;
                if (!offsets.includes(offset)) {
                    continue;
                }
                try {
                    // Idempotency: has a reminder already been created for this cert + offset?
                    const existing = yield (0, cosmos_1.queryAll)({
                        query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @type AND c.certId = @cid AND c.windowOffsetDays = @off AND c.channel = @ch',
                        parameters: [
                            { name: '@type', value: 'reminder' },
                            { name: '@cid', value: cert.id },
                            { name: '@off', value: offset },
                            { name: '@ch', value: 'email' },
                        ],
                    });
                    if (existing.length > 0) {
                        context.log(`Reminder already exists for cert ${cert.id} T+${offset}`);
                        continue;
                    }
                    // Load person email
                    const people = yield (0, cosmos_1.queryAll)({
                        query: 'SELECT TOP 1 c.id, c.type, c.districtId, c.fullName, c.email FROM c WHERE c.type = @t AND c.id = @pid',
                        parameters: [
                            { name: '@t', value: 'person' },
                            { name: '@pid', value: cert.personId },
                        ],
                    });
                    if (people.length === 0) {
                        context.log(`No person found for cert ${cert.id} personId=${cert.personId}`);
                        continue;
                    }
                    const person = people[0];
                    const status = (0, status_1.computeStatus)(cert.expiryDate);
                    const subject = `Reminder: ${cert.certTypeKey} expires in ${offset} day${offset === 1 ? '' : 's'}`;
                    const expDate = new Date(cert.expiryDate).toISOString().slice(0, 10);
                    const html = `
          <p>Hello ${person.fullName},</p>
          <p>Your certification <strong>${cert.certTypeKey}</strong> is ${status} and is due on <strong>${expDate}</strong>.</p>
          <p>This is an automated reminder (${offset} day${offset === 1 ? '' : 's'} before expiry).</p>
        `;
                    const providerId = yield (0, email_1.sendEmail)(person.email, subject, html);
                    const reminderDoc = {
                        id: (0, node_crypto_1.randomUUID)(),
                        type: 'reminder',
                        districtId: cert.districtId,
                        certId: cert.id,
                        windowOffsetDays: offset,
                        channel: 'email',
                        to: person.email,
                        status: 'sent',
                        providerId,
                        sendAt: new Date().toISOString(),
                        meta: { certTypeKey: cert.certTypeKey },
                        createdAt: new Date().toISOString(),
                    };
                    yield cosmos_1.entities.items.create(reminderDoc);
                    context.log(`Reminder sent for cert ${cert.id} to ${person.email} (offset ${offset})`);
                }
                catch (err) {
                    context.error(`Failed processing cert ${cert.id}:`, err);
                }
            }
        }
    });
}
functions_1.app.timer('reminderEngine', {
    // NCRONTAB: sec min hour day month day-of-week
    schedule: '0 0 * * * *', // hourly at minute 0
    runOnStartup: false,
    handler: reminderEngine,
});
//# sourceMappingURL=reminderEngine.js.map