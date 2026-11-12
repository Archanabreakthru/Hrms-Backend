"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
exports.requirePermission = requirePermission;
exports.requireScope = requireScope;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AppError_1 = require("../errors/AppError");
function createAuthMiddleware(jwtSecret, issuer = 'orbyx-auth-service', audience = 'orbyx-hrms-client') {
    return (req, res, next) => {
        // 1. Check for token in Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError_1.UnauthorizedError('Missing or malformed Authorization header'));
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret, {
                issuer,
                audience,
            });
            req.user = {
                id: decoded.sub,
                email: decoded.email,
                role: decoded.role,
                employeeId: decoded.employeeId,
                departmentId: decoded.departmentId,
                clientId: decoded.clientId,
                permissions: decoded.permissions || [],
            };
            next();
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                return next(new AppError_1.UnauthorizedError('Token has expired'));
            }
            return next(new AppError_1.UnauthorizedError('Invalid token signature or payload'));
        }
    };
}
function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError_1.UnauthorizedError('Authentication required'));
        }
        const userPerms = new Set(req.user.permissions);
        const hasPermission = requiredPermissions.some((perm) => userPerms.has(perm));
        if (!hasPermission) {
            return next(new AppError_1.ForbiddenError(`Insufficient permissions. Required one of: ${requiredPermissions.join(', ')}`));
        }
        next();
    };
}
function requireScope(evaluator) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError_1.UnauthorizedError('Authentication required'));
        }
        const result = evaluator(req.user, req);
        if (!result.allowed) {
            return next(new AppError_1.ForbiddenError(result.reason || 'Data access scope restriction violation'));
        }
        next();
    };
}
