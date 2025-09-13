"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysToExpiry = daysToExpiry;
exports.computeStatus = computeStatus;
exports.startOfDay = startOfDay;
exports.dayWindow = dayWindow;
function daysToExpiry(expiryDateIso) {
    const now = startOfDay(new Date());
    const expiry = startOfDay(new Date(expiryDateIso));
    const diffMs = expiry.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
function computeStatus(expiryDateIso, expiringThresholdDays = 30) {
    const days = daysToExpiry(expiryDateIso);
    if (days < 0)
        return 'expired';
    if (days < expiringThresholdDays)
        return 'expiring';
    return 'valid';
}
function startOfDay(d) {
    const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    return nd;
}
function dayWindow(offsetDays) {
    const start = startOfDay(new Date());
    start.setUTCDate(start.getUTCDate() + offsetDays);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}
//# sourceMappingURL=status.js.map