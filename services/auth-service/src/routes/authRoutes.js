"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = createAuthRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const authValidators_1 = require("../validators/authValidators");
const serviceAuth_1 = require("../middleware/serviceAuth");
const env_1 = require("../config/env");
function createAuthRouter(authController) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    router.post('/login', (0, validation_1.validateRequest)(authValidators_1.loginSchema), authController.login);
    router.post('/refresh', (0, validation_1.validateRequest)(authValidators_1.refreshTokenSchema), authController.refresh);
    router.post('/logout', authController.logout);
    // Internal Service-to-Service Account Provisioning (Protected by HMAC Service Signature)
    router.post('/provision', (0, serviceAuth_1.verifyServiceAuth)('employee-service'), (0, validation_1.validateRequest)(authValidators_1.provisionUserSchema), authController.provision);
    // Public Employee Account Activation
    router.post('/activate', (0, validation_1.validateRequest)(authValidators_1.activateAccountSchema), authController.activate);
    // HR Resend Account Invitation (Protected by auth.users.manage permission)
    router.post('/resend-invite', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage'), (0, validation_1.validateRequest)(authValidators_1.resendInviteSchema), authController.resendInvite);
    // Administrative user creation (Requires auth.users.manage permission)
    router.post('/register', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage'), (0, validation_1.validateRequest)(authValidators_1.registerUserSchema), authController.register);
    // Current session info
    router.get('/me', authMiddleware, authController.me);
    // User & Role Management endpoints for Super Admin / authorized operators
    router.get('/users', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage', 'org.profile.manage'), authController.listUsers);
    router.put('/users/:id/role', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage'), authController.updateRole);
    // Dynamic Roles & Permissions Management endpoints
    router.get('/roles', authMiddleware, authController.listRoles);
    router.post('/roles', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage'), authController.createRole);
    router.put('/roles/:code', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage'), authController.updateRoleDefinition);
    router.delete('/roles/:code', authMiddleware, (0, auth_1.requirePermission)('auth.users.manage'), authController.deleteRole);
    router.get('/permissions', authMiddleware, authController.listPermissions);
    return router;
}
