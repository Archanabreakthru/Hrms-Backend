"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiSuccess = apiSuccess;
exports.sendSuccess = sendSuccess;
exports.apiError = apiError;
function apiSuccess(res, data, statusCode = 200, meta, correlationId) {
    const body = {
        success: true,
        data,
        meta,
        timestamp: new Date().toISOString(),
        correlationId: correlationId || res.locals?.correlationId,
    };
    return res.status(statusCode).json(body);
}
function sendSuccess(res, data, message, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    });
}
function apiError(res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details, correlationId) {
    const body = {
        success: false,
        error: {
            code,
            message,
            details,
        },
        timestamp: new Date().toISOString(),
        correlationId: correlationId || res.locals?.correlationId,
    };
    return res.status(statusCode).json(body);
}
