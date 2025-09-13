export function json(status: number, data: any, headers?: Record<string, string>) {
  return { status, body: JSON.stringify(data), headers } as const;
}

export function ok(data: any) {
  return json(200, data);
}

export function created(data: any) {
  return json(201, data);
}

export function error(status: number, code: string, message: string, details?: any) {
  return json(status, { error: { code, message, details } });
}

export const ERR = {
  UNAUTHORIZED: (msg = 'Unauthorized', details?: any) => error(401, 'UNAUTHORIZED', msg, details),
  FORBIDDEN: (msg = 'Forbidden', details?: any) => error(403, 'FORBIDDEN', msg, details),
  NO_DISTRICT: (msg = 'USER_NO_DISTRICT', details?: any) => error(403, 'USER_NO_DISTRICT', msg, details),
  METHOD_NOT_ALLOWED: (msg = 'Method not allowed', details?: any) => error(405, 'METHOD_NOT_ALLOWED', msg, details),
  NOT_FOUND: (msg = 'Not found', details?: any) => error(404, 'NOT_FOUND', msg, details),
  VALIDATION: (msg = 'Validation error', details?: any) => error(400, 'VALIDATION_ERROR', msg, details),
  CONFLICT: (msg = 'Conflict', details?: any) => error(409, 'CONFLICT', msg, details),
  INTERNAL: (msg = 'Internal server error', details?: any) => error(500, 'INTERNAL_ERROR', msg, details),
};

