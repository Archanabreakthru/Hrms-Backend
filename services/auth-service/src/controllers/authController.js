"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const userAgent = req.headers['user-agent'];
            const ipAddress = req.ip || req.socket.remoteAddress;
            const result = await this.authService.login(email, password, { userAgent, ipAddress });
            (0, apiResponse_1.apiSuccess)(res, result, 200);
        }
        catch (err) {
            next(err);
        }
    };
    refresh = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refresh(refreshToken);
            (0, apiResponse_1.apiSuccess)(res, result, 200);
        }
        catch (err) {
            next(err);
        }
    };
    logout = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            if (refreshToken) {
                await this.authService.logout(refreshToken);
            }
            (0, apiResponse_1.apiSuccess)(res, { message: 'Logged out successfully' }, 200);
        }
        catch (err) {
            next(err);
        }
    };
    register = async (req, res, next) => {
        try {
            const result = await this.authService.register(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, result, 201);
        }
        catch (err) {
            next(err);
        }
    };
    me = async (req, res, next) => {
        try {
            (0, apiResponse_1.apiSuccess)(res, req.user, 200);
        }
        catch (err) {
            next(err);
        }
    };
    provision = async (req, res, next) => {
        try {
            const result = await this.authService.provision(req.body);
            // Notice: token is returned only to internal service caller (outbox dispatcher)
            (0, apiResponse_1.apiSuccess)(res, result, result.isNew ? 201 : 200);
        }
        catch (err) {
            next(err);
        }
    };
    activate = async (req, res, next) => {
        try {
            const { token, password } = req.body;
            const result = await this.authService.activate(token, password);
            (0, apiResponse_1.apiSuccess)(res, result, 200);
        }
        catch (err) {
            next(err);
        }
    };
    resendInvite = async (req, res, next) => {
        try {
            const { employeeId } = req.body;
            const actor = req.user;
            const result = await this.authService.resendInvitation(employeeId, actor);
            // Dispatch activation email via Notification Service
            if (result.activationToken) {
                try {
                    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008';
                    await fetch(`${notificationUrl}/api/v1/notifications/dispatch`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipientId: result.email,
                            title: 'Welcome to Celestial - Your HRMS Account Is Ready',
                            message: 'A fresh activation invitation has been generated for your account. Please activate within 24 hours.',
                            channel: 'EMAIL',
                            metadata: {
                                recipientEmail: result.email,
                                employeeId: result.employeeId,
                                activationToken: result.activationToken,
                            },
                        }),
                    });
                }
                catch (notifErr) {
                    console.warn('[auth-service] Notification dispatch on resend-invite deferred:', notifErr.message);
                }
            }
            (0, apiResponse_1.apiSuccess)(res, result, 200);
        }
        catch (err) {
            next(err);
        }
    };
    listUsers = async (req, res, next) => {
        try {
            const users = await this.authService.listUsers();
            (0, apiResponse_1.apiSuccess)(res, users, 200);
        }
        catch (err) {
            next(err);
        }
    };
    updateRole = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const updated = await this.authService.updateUserRole(id, role);
            (0, apiResponse_1.apiSuccess)(res, updated, 200);
        }
        catch (err) {
            next(err);
        }
    };
    listRoles = async (req, res, next) => {
        try {
            const roles = await this.authService.listRoles();
            (0, apiResponse_1.apiSuccess)(res, roles, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createRole = async (req, res, next) => {
        try {
            const created = await this.authService.createRole(req.body);
            (0, apiResponse_1.apiSuccess)(res, created, 201);
        }
        catch (err) {
            next(err);
        }
    };
    updateRoleDefinition = async (req, res, next) => {
        try {
            const { code } = req.params;
            const updated = await this.authService.updateRole(code, req.body);
            (0, apiResponse_1.apiSuccess)(res, updated, 200);
        }
        catch (err) {
            next(err);
        }
    };
    deleteRole = async (req, res, next) => {
        try {
            const { code } = req.params;
            const result = await this.authService.deleteRole(code);
            (0, apiResponse_1.apiSuccess)(res, { deleted: result }, 200);
        }
        catch (err) {
            next(err);
        }
    };
    listPermissions = async (req, res, next) => {
        try {
            const permissions = await this.authService.listAllPermissions();
            (0, apiResponse_1.apiSuccess)(res, permissions, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.AuthController = AuthController;
