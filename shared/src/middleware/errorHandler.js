"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const AppError_1 = require("../errors/AppError");
const apiResponse_1 = require("../utilities/apiResponse");
function errorHandler(err, req, res, next) {
    const correlationId = res.locals?.correlationId;
    if (err instanceof AppError_1.AppError) {
        (0, apiResponse_1.apiError)(res, err.statusCode, err.code, err.message, err.details, correlationId);
        return;
    }
    // Unhandled internal server error
    console.error(`[UnhandledError] [${correlationId}]`, err);
    (0, apiResponse_1.apiError)(res, 500, 'INTERNAL_SERVER_ERROR', process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message, undefined, correlationId);
}
