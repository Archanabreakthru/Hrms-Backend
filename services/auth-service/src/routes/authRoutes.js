"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = createAuthRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const authValidators_1 = require("../validators/authValidators");
const env_1 = require("../config/env");
function createAuthRouter(authController) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    router.post('/login', (0, validation_1.validateRequest)(authValidators_1.loginSchema), authController.login);
    router.post('/refresh', (0, validation_1.validateRequest)(authValidators_1.refreshTokenSchema), authController.refresh);
    router.post('/logout', authController.logout);
    // Administrative user creation (Requires auth.users.manage permission)
    router.post('/register', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage'), (0, validation_1.validateRequest)(authValidators_1.registerUserSchema), authController.register);
    // Current session info
    router.get('/me', authMiddleware, authController.me);
    return router;
}
