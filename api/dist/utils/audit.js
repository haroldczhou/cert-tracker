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
exports.auditLog = auditLog;
const cosmos_1 = require("./cosmos");
function auditLog(districtId_1, actorUid_1, action_1, entityType_1, entityId_1) {
    return __awaiter(this, arguments, void 0, function* (districtId, actorUid, action, entityType, entityId, meta = {}) {
        const doc = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            type: 'audit',
            districtId,
            actorUid,
            action,
            entityType,
            entityId,
            meta,
            createdAt: new Date().toISOString(),
        };
        yield cosmos_1.entities.items.create(doc);
    });
}
//# sourceMappingURL=audit.js.map