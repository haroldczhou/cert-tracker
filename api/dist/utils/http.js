"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERR = void 0;
exports.json = json;
exports.ok = ok;
exports.created = created;
exports.error = error;
function json(status, data, headers) {
    return { status, body: JSON.stringify(data), headers };
}
function ok(data) {
    return json(200, data);
}
function created(data) {
    return json(201, data);
}
function error(status, code, message, details) {
    return json(status, { error: { code, message, details } });
}
exports.ERR = {
    UNAUTHORIZED: (msg = 'Unauthorized', details) => error(401, 'UNAUTHORIZED', msg, details),
    FORBIDDEN: (msg = 'Forbidden', details) => error(403, 'FORBIDDEN', msg, details),
    NO_DISTRICT: (msg = 'USER_NO_DISTRICT', details) => error(403, 'USER_NO_DISTRICT', msg, details),
    METHOD_NOT_ALLOWED: (msg = 'Method not allowed', details) => error(405, 'METHOD_NOT_ALLOWED', msg, details),
    NOT_FOUND: (msg = 'Not found', details) => error(404, 'NOT_FOUND', msg, details),
    VALIDATION: (msg = 'Validation error', details) => error(400, 'VALIDATION_ERROR', msg, details),
    CONFLICT: (msg = 'Conflict', details) => error(409, 'CONFLICT', msg, details),
    INTERNAL: (msg = 'Internal server error', details) => error(500, 'INTERNAL_ERROR', msg, details),
};
//# sourceMappingURL=http.js.map