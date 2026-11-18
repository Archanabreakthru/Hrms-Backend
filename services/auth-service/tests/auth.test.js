"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const authService_1 = require("../src/services/authService");
const authRepository_1 = require("../src/repositories/authRepository");
const roles_1 = require("../../../shared/src/constants/roles");
(0, node_test_1.default)('AuthService registers a user, hashes password, and successfully authenticates', async () => {
    const repo = new authRepository_1.InMemoryAuthRepository();
    const service = new authService_1.AuthService(repo);
    const user = await service.register({
        email: 'hr@orbyx.internal',
        password: 'Password123!',
        role: roles_1.UserRole.HR_ADMIN,
        employeeId: 'EMP-HRM-0001',
    });
    strict_1.default.equal(user.email, 'hr@orbyx.internal');
    strict_1.default.equal(user.role, roles_1.UserRole.HR_ADMIN);
    // Successful login
    const loginResult = await service.login('hr@orbyx.internal', 'Password123!');
    strict_1.default.ok(loginResult.accessToken);
    strict_1.default.ok(loginResult.refreshToken);
    strict_1.default.ok(loginResult.permissions.includes('payroll.process'));
    strict_1.default.ok(loginResult.permissions.includes('employee.profile.read_all'));
    // Ensure HR admin doesn't have client portal login
    strict_1.default.ok(!loginResult.permissions.includes('client.portal.login'));
    // Invalid password rejects
    await strict_1.default.rejects(async () => {
        await service.login('hr@orbyx.internal', 'WrongPassword!');
    }, {
        name: 'UnauthorizedError',
        message: 'Invalid email or password',
    });
});
(0, node_test_1.default)('AuthService refreshes token with automatic session rotation', async () => {
    const repo = new authRepository_1.InMemoryAuthRepository();
    const service = new authService_1.AuthService(repo);
    await service.register({
        email: 'emp@orbyx.internal',
        password: 'Password123!',
        role: roles_1.UserRole.EMPLOYEE,
        employeeId: 'EMP-SWE-0002',
    });
    const { refreshToken: oldRefreshToken } = await service.login('emp@orbyx.internal', 'Password123!');
    const refreshResult = await service.refresh(oldRefreshToken);
    strict_1.default.ok(refreshResult.accessToken);
    strict_1.default.ok(refreshResult.refreshToken);
    strict_1.default.notEqual(refreshResult.refreshToken, oldRefreshToken);
    // Using old refresh token again is rejected (rotated out)
    await strict_1.default.rejects(async () => {
        await service.refresh(oldRefreshToken);
    }, {
        name: 'UnauthorizedError',
    });
});
(0, node_test_1.default)('AuthService Client Supervisor login receives tenant-isolated permissions', async () => {
    const repo = new authRepository_1.InMemoryAuthRepository();
    const service = new authService_1.AuthService(repo);
    await service.register({
        email: 'supervisor@acme.com',
        password: 'SupervisorPass123!',
        role: roles_1.UserRole.CLIENT_SUPERVISOR,
        clientId: 'CLI-001',
    });
    const loginResult = await service.login('supervisor@acme.com', 'SupervisorPass123!');
    strict_1.default.equal(loginResult.user.clientId, 'CLI-001');
    strict_1.default.ok(loginResult.permissions.includes('client.portal.login'));
    strict_1.default.ok(loginResult.permissions.includes('client.attendance.verify_deployed'));
    // Strict tenant restriction: zero internal permissions
    strict_1.default.ok(!loginResult.permissions.includes('employee.profile.read_all'));
    strict_1.default.ok(!loginResult.permissions.includes('payroll.process'));
    strict_1.default.ok(!loginResult.permissions.includes('system.config.write'));
});
