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
exports.statusSweeper = statusSweeper;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("./utils/cosmos");
const status_1 = require("./utils/status");
const reminderConfig_1 = require("./utils/reminderConfig");
function statusSweeper(timer, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const runAt = new Date().toISOString();
        context.log(`Status sweeper started at ${runAt}`);
        try {
            const certs = yield (0, cosmos_1.queryAll)({
                query: 'SELECT * FROM c WHERE c.type = @t',
                parameters: [{ name: '@t', value: 'cert' }],
            });
            let updates = 0;
            for (const cert of certs) {
                if (!cert.expiryDate)
                    continue;
                const cfg = yield (0, reminderConfig_1.queryDistrictConfig)(cert.districtId, context);
                const threshold = (_a = cfg === null || cfg === void 0 ? void 0 : cfg.expiringThresholdDays) !== null && _a !== void 0 ? _a : 30;
                const newStatus = (0, status_1.computeStatus)(cert.expiryDate, threshold);
                if (cert.status !== newStatus) {
                    cert.status = newStatus;
                    cert.statusComputedAt = runAt;
                    cert.updatedAt = runAt;
                    yield cosmos_1.entities.items.upsert(cert);
                    updates++;
                }
            }
            context.log(`Status sweeper completed. Updated ${updates} cert(s).`);
        }
        catch (err) {
            context.error('Status sweeper error', err);
        }
    });
}
functions_1.app.timer('statusSweeper', {
    // Run daily at 02:00 UTC
    schedule: '0 0 2 * * *',
    runOnStartup: false,
    handler: statusSweeper,
});
//# sourceMappingURL=statusSweeper.js.map