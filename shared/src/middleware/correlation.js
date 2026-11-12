"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationMiddleware = correlationMiddleware;
const crypto_1 = __importDefault(require("crypto"));
function correlationMiddleware(req, res, next) {
    const incomingId = req.headers['x-correlation-id'];
    const correlationId = typeof incomingId === 'string' && incomingId.trim() ? incomingId : crypto_1.default.randomUUID();
    res.locals.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
}
