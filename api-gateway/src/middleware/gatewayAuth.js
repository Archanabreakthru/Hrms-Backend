"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayAuth = gatewayAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
/**
 * Validates JWT at the edge, strips untrusted forwarded headers,
 * and sets sanitized identity claims for downstream microservices.
 */
function gatewayAuth(optional = false) {
    return (req, res, next) => {
        // Strip any spoofed headers from incoming client request
        delete req.headers['x-user-id'];
        delete req.headers['x-user-role'];
        delete req.headers['x-employee-id'];
        delete req.headers['x-tenant-id'];
        delete req.headers['x-client-id'];
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            if (optional)
                return next();
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
            });
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.gatewayConfig.jwtSecret);
            // Inject verified downstream headers (supports sub and userId)
            const sanitizedUserId = decoded.userId || decoded.sub;
            req.headers['x-user-id'] = sanitizedUserId;
            req.headers['x-user-role'] = decoded.role;
            if (decoded.employeeId)
                req.headers['x-employee-id'] = decoded.employeeId;
            if (decoded.tenantId)
                req.headers['x-tenant-id'] = decoded.tenantId;
            if (decoded.clientId)
                req.headers['x-client-id'] = decoded.clientId;
            req.user = decoded;
            next();
        }
        catch {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid' },
            });
        }
    };
}
