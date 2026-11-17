"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const crypto_1 = __importDefault(require("crypto"));
const bootstrapService_1 = require("../src/services/bootstrapService");
const authService_1 = require("../src/services/authService");
const roles_1 = require("../../../shared/src/constants/roles");
/**
 * Isolated In-Memory Database Simulator for Concurrency & Bootstrap Testing
 */
class IsolatedBootstrapDbSimulator {
    usersMap = new Map();
    rolesMap = new Map();
    userRolesList = [];
    sessionsMap = new Map();
    advisoryLockHeld = false;
    constructor() {
        // Seed standard HR_ADMIN role
        this.rolesMap.set(roles_1.UserRole.HR_ADMIN, {
            id: 'role-uuid-hr-admin',
            code: roles_1.UserRole.HR_ADMIN,
            name: 'HR Administrator',
            permissions: [
                { permission: { code: 'org.profile.read' } },
                { permission: { code: 'org.profile.manage' } },
                { permission: { code: 'auth.users.manage' } },
            ],
        });
        // Seed standard SUPER_ADMIN role
        this.rolesMap.set(roles_1.UserRole.SUPER_ADMIN, {
            id: 'role-uuid-super-admin',
            code: roles_1.UserRole.SUPER_ADMIN,
            name: 'Super Administrator',
            permissions: [
                { permission: { code: 'system.config.read' } },
                { permission: { code: 'system.config.write' } },
                { permission: { code: 'auth.users.manage' } },
            ],
        });
    }
    async $transaction(fn) {
        return await fn(this);
    }
    async $executeRawUnsafe(sql) {
        if (sql.includes('pg_advisory_xact_lock')) {
            if (this.advisoryLockHeld) {
                throw new Error('Lock acquisition failed: Concurrent bootstrap transaction in progress');
            }
            this.advisoryLockHeld = true;
        }
        return 1;
    }
    users = {
        findFirst: async (args) => {
            for (const u of this.usersMap.values()) {
                if (args.where?.username && u.username !== args.where.username)
                    continue;
                if (args.where?.roleCode && u.roleCode !== args.where.roleCode)
                    continue;
                if (args.where?.status?.in && !args.where.status.in.includes(u.status))
                    continue;
                return { ...u };
            }
            return null;
        },
        findUnique: async (args) => {
            if (args.where?.email) {
                for (const u of this.usersMap.values()) {
                    if (u.email.toLowerCase() === args.where.email.toLowerCase())
                        return { ...u };
                }
            }
            if (args.where?.id) {
                const u = this.usersMap.get(args.where.id);
                return u ? { ...u } : null;
            }
            return null;
        },
        create: async (args) => {
            const id = 'usr-' + crypto_1.default.randomBytes(8).toString('hex');
            const record = {
                id,
                ...args.data,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.usersMap.set(id, record);
            return { ...record };
        },
        update: async (args) => {
            const existing = this.usersMap.get(args.where.id);
            if (!existing)
                throw new Error('User not found');
            const updated = { ...existing, ...args.data, updatedAt: new Date() };
            this.usersMap.set(args.where.id, updated);
            return { ...updated };
        },
    };
    roles = {
        findUnique: async (args) => {
            const r = this.rolesMap.get(args.where.code);
            return r ? { ...r } : null;
        },
    };
    userRoles = {
        create: async (args) => {
            const record = { id: 'ur-' + crypto_1.default.randomBytes(4).toString('hex'), ...args.data };
            this.userRolesList.push(record);
            return record;
        },
    };
    serviceNonces = {
        create: async () => ({ nonce: 'nonce-1' }),
    };
    // --- IAuthRepository methods for AuthService activation & login tests ---
    async findUserByEmail(email) {
        for (const u of this.usersMap.values()) {
            if (u.email.toLowerCase() === email.toLowerCase()) {
                return this.mapToUserRecord(u);
            }
        }
        return null;
    }
    async findUserById(id) {
        const u = this.usersMap.get(id);
        return u ? this.mapToUserRecord(u) : null;
    }
    async findUserByEmployeeId() {
        return null;
    }
    async findUserByActivationTokenHash(tokenHash) {
        for (const u of this.usersMap.values()) {
            if (u.activationTokenHash === tokenHash) {
                return this.mapToUserRecord(u);
            }
        }
        return null;
    }
    async getUserPermissions(userId, roleCode) {
        const role = this.rolesMap.get(roleCode);
        if (!role)
            return [];
        return role.permissions.map((p) => p.permission.code);
    }
    async recordLoginSuccess(userId) {
        const u = this.usersMap.get(userId);
        if (u) {
            u.failedLoginAttempts = 0;
            u.lockedUntil = null;
            u.lastLoginAt = new Date();
        }
    }
    async recordLoginFailure(userId, currentFailedAttempts) {
        const u = this.usersMap.get(userId);
        if (u) {
            u.failedLoginAttempts = currentFailedAttempts + 1;
        }
    }
    async createUser(user) {
        const id = 'usr-' + crypto_1.default.randomBytes(8).toString('hex');
        const record = { id, ...user, createdAt: new Date(), updatedAt: new Date() };
        this.usersMap.set(id, record);
        return this.mapToUserRecord(record);
    }
    async updateUserActivation(userId, data) {
        const u = this.usersMap.get(userId);
        if (!u)
            throw new Error('User not found');
        Object.assign(u, data);
        return this.mapToUserRecord(u);
    }
    async createSession(session) {
        const id = 'sess-' + crypto_1.default.randomBytes(8).toString('hex');
        const rec = { id, ...session, createdAt: new Date(), updatedAt: new Date() };
        this.sessionsMap.set(rec.refreshToken, rec);
        return rec;
    }
    async findSessionByRefreshToken(refreshToken) {
        return this.sessionsMap.get(refreshToken) || null;
    }
    async revokeSession(id) {
        for (const s of this.sessionsMap.values()) {
            if (s.id === id)
                s.isRevoked = true;
        }
    }
    async revokeAllUserSessions() { }
    async updateInvitationToken() { throw new Error('Not implemented'); }
    mapToUserRecord(raw) {
        return {
            id: raw.id,
            email: raw.email,
            passwordHash: raw.passwordHash,
            role: raw.roleCode,
            status: raw.status,
            employeeId: raw.employeeId,
            departmentId: raw.departmentId,
            clientId: raw.clientId,
            isActive: raw.isActive,
            failedLoginAttempts: raw.failedLoginAttempts || 0,
            lockedUntil: raw.lockedUntil || null,
            invitationStatus: raw.invitationStatus || null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
// =========================================================================
// TEST SUITE: First-Time HR Administrator Bootstrap & Lifecycle
// =========================================================================
(0, node_test_1.default)('1. Fresh installation: bootstrap successfully provisions first HR Admin with unactivated status', async () => {
    const db = new IsolatedBootstrapDbSimulator();
    const res = await (0, bootstrapService_1.bootstrapHrAdministrator)(db, {
        email: 'admin.first@celestial.internal',
        name: 'Initial HR Administrator',
    });
    strict_1.default.equal(res.status, 'SUCCESS');
    strict_1.default.equal(res.email, 'admin.first@celestial.internal');
    strict_1.default.equal(res.role, roles_1.UserRole.HR_ADMIN);
    strict_1.default.ok(res.activationToken);
    strict_1.default.ok(res.activationUrl?.includes(res.activationToken));
    // Verify database record
    const savedUser = db.usersMap.get(res.userId);
    strict_1.default.ok(savedUser);
    strict_1.default.equal(savedUser.status, 'PENDING_ACTIVATION');
    strict_1.default.equal(savedUser.invitationStatus, 'PENDING_ACTIVATION');
    // Verify passwordHash is NOT plaintext and contains high-entropy unactivated salt:key pair
    strict_1.default.ok(savedUser.passwordHash.includes(':'));
    strict_1.default.ok(!savedUser.passwordHash.includes('PENDING_BOOTSTRAP_ACTIVATION'));
    strict_1.default.equal(savedUser.passwordHash.split(':')[0].length, 32); // 16 bytes hex salt
    // Verify role relationship in user_roles
    strict_1.default.equal(db.userRolesList.length, 1);
    strict_1.default.equal(db.userRolesList[0].userId, res.userId);
    strict_1.default.equal(db.userRolesList[0].roleId, 'role-uuid-hr-admin');
});
(0, node_test_1.default)('2. Concurrency & Idempotency: Second bootstrap attempt safely aborts without creating duplicate admin', async () => {
    const db = new IsolatedBootstrapDbSimulator();
    // First run succeeds
    const first = await (0, bootstrapService_1.bootstrapHrAdministrator)(db, { email: 'admin.first@celestial.internal' });
    strict_1.default.equal(first.status, 'SUCCESS');
    // Second run with a different email
    const second = await (0, bootstrapService_1.bootstrapHrAdministrator)(db, { email: 'admin.second@celestial.internal' });
    strict_1.default.equal(second.status, 'ALREADY_INITIALIZED');
    strict_1.default.equal(second.existingAdminEmail, 'admin.first@celestial.internal');
    strict_1.default.ok(second.message.includes('already initialized'));
    // Database must still have exactly 1 user
    strict_1.default.equal(db.usersMap.size, 1);
});
(0, node_test_1.default)('3. Preservation of existing environment (e.g. Raseedh): bootstrap detects existing active admin and halts', async () => {
    const db = new IsolatedBootstrapDbSimulator();
    // Simulate existing database with Raseedh
    db.usersMap.set('raseedh-uuid', {
        id: 'raseedh-uuid',
        email: 'raseedh@orbyx.internal',
        roleCode: roles_1.UserRole.HR_ADMIN,
        status: 'ACTIVE',
        employeeId: 'EMP-HRM-0012',
        isActive: true,
    });
    const res = await (0, bootstrapService_1.bootstrapHrAdministrator)(db, { email: 'new.candidate@celestial.internal' });
    strict_1.default.equal(res.status, 'ALREADY_INITIALIZED');
    strict_1.default.equal(res.existingAdminEmail, 'raseedh@orbyx.internal');
    strict_1.default.equal(db.usersMap.size, 1);
    strict_1.default.ok(db.usersMap.has('raseedh-uuid'));
});
(0, node_test_1.default)('4. Security gate: Login is explicitly rejected when account is PENDING_ACTIVATION', async () => {
    const db = new IsolatedBootstrapDbSimulator();
    const authService = new authService_1.AuthService(db);
    // Bootstrap account
    const bootRes = await (0, bootstrapService_1.bootstrapHrAdministrator)(db, { email: 'admin.pending@celestial.internal' });
    strict_1.default.equal(bootRes.status, 'SUCCESS');
    // Attempt to login before activation
    await strict_1.default.rejects(async () => {
        await authService.login('admin.pending@celestial.internal', 'AnyPassword123!');
    }, {
        name: 'UnauthorizedError',
        message: 'Account pending activation. Please use the activation link sent to your registered email.',
    });
});
(0, node_test_1.default)('5. Full Activation & Authenticated Login Workflow with Role Permissions', async () => {
    const db = new IsolatedBootstrapDbSimulator();
    const authService = new authService_1.AuthService(db);
    // 1. Operator bootstraps first admin
    const bootRes = await (0, bootstrapService_1.bootstrapHrAdministrator)(db, { email: 'admin.active@celestial.internal' });
    strict_1.default.equal(bootRes.status, 'SUCCESS');
    const token = bootRes.activationToken;
    // 2. Admin activates account and sets secure password
    const actRes = await authService.activate(token, 'CelestialSecure#2026');
    strict_1.default.equal(actRes.success, true);
    strict_1.default.equal(actRes.email, 'admin.active@celestial.internal');
    // User state in DB transitions to ACTIVE and activated
    const activatedUser = db.usersMap.get(bootRes.userId);
    strict_1.default.equal(activatedUser.status, 'ACTIVE');
    strict_1.default.equal(activatedUser.invitationStatus, 'ACTIVATED');
    strict_1.default.equal(activatedUser.activationTokenHash, null);
    // 3. Login with newly activated credentials
    const loginRes = await authService.login('admin.active@celestial.internal', 'CelestialSecure#2026');
    strict_1.default.ok(loginRes.accessToken);
    strict_1.default.ok(loginRes.refreshToken);
    strict_1.default.equal(loginRes.user.email, 'admin.active@celestial.internal');
    strict_1.default.equal(loginRes.user.role, roles_1.UserRole.HR_ADMIN);
    // Verify database-backed permissions for HR Administrator
    strict_1.default.ok(loginRes.permissions.includes('org.profile.manage'));
    strict_1.default.ok(loginRes.permissions.includes('org.profile.read'));
    strict_1.default.ok(loginRes.permissions.includes('auth.users.manage'));
    // 4. Token Reuse Prevention: Attempting to activate again with the used token must fail
    await strict_1.default.rejects(async () => {
        await authService.activate(token, 'AnotherPassword#999');
    }, {
        name: 'UnauthorizedError',
        message: 'Invalid or expired activation link',
    });
    // 5. Wrong password rejected
    await strict_1.default.rejects(async () => {
        await authService.login('admin.active@celestial.internal', 'WrongPassword!');
    }, {
        name: 'UnauthorizedError',
        message: 'Invalid email or password',
    });
});
(0, node_test_1.default)('Dedicated Bootstrap Administrator: provisions separate account alongside existing users, activates, and logs in', async () => {
    const db = new IsolatedBootstrapDbSimulator();
    const authService = new authService_1.AuthService(db);
    // Prepopulate existing Raseedh and existing Super Admin
    db.usersMap.set('user-existing-raseedh', {
        id: 'user-existing-raseedh',
        email: 'raseedh@orbyx.internal',
        passwordHash: 'PBKDF2$salt$hash',
        roleCode: roles_1.UserRole.HR_ADMIN,
        status: 'ACTIVE',
        employeeId: 'EMP-HRM-0012',
        isActive: true,
    });
    db.usersMap.set('user-existing-superadmin', {
        id: 'user-existing-superadmin',
        email: 'admin.system@orbyx.internal',
        passwordHash: 'PBKDF2$salt$hash',
        roleCode: roles_1.UserRole.SUPER_ADMIN,
        status: 'ACTIVE',
        isActive: true,
    });
    const initialCount = db.usersMap.size;
    strict_1.default.equal(initialCount, 2);
    // 1. Provision dedicated bootstrap administrator
    const provisionRes = await (0, bootstrapService_1.bootstrapDedicatedAdministrator)(db, {
        email: 'dedicated.bootstrap@orbyx.internal',
        authorizedBy: 'admin.system@orbyx.internal',
    }, { portalBaseUrl: 'https://hrms.orbyx.internal' });
    strict_1.default.equal(provisionRes.status, 'SUCCESS');
    strict_1.default.ok(provisionRes.userId);
    strict_1.default.equal(provisionRes.email, 'dedicated.bootstrap@orbyx.internal');
    strict_1.default.equal(provisionRes.role, roles_1.UserRole.SUPER_ADMIN);
    strict_1.default.ok(provisionRes.activationToken);
    strict_1.default.ok(provisionRes.activationUrl?.includes('/#/activate?token='));
    // Verify total users incremented by exactly 1
    strict_1.default.equal(db.usersMap.size, 3);
    // Verify existing users remain completely untouched
    const raseedh = db.usersMap.get('user-existing-raseedh');
    strict_1.default.equal(raseedh.email, 'raseedh@orbyx.internal');
    strict_1.default.equal(raseedh.status, 'ACTIVE');
    const existingSuper = db.usersMap.get('user-existing-superadmin');
    strict_1.default.equal(existingSuper.email, 'admin.system@orbyx.internal');
    strict_1.default.equal(existingSuper.status, 'ACTIVE');
    // 2. Reject duplicate provisioning
    const duplicateRes = await (0, bootstrapService_1.bootstrapDedicatedAdministrator)(db, {
        email: 'another.bootstrap@orbyx.internal',
        authorizedBy: 'admin.system@orbyx.internal',
    });
    strict_1.default.equal(duplicateRes.status, 'ALREADY_INITIALIZED');
    strict_1.default.equal(db.usersMap.size, 3); // Unchanged
    // 3. Login attempt while PENDING_ACTIVATION must be rejected
    await strict_1.default.rejects(async () => {
        await authService.login('dedicated.bootstrap@orbyx.internal', 'AnyPassword123!');
    }, {
        name: 'UnauthorizedError',
        message: 'Account pending activation. Please use the activation link sent to your registered email.',
    });
    // 4. Activate dedicated bootstrap administrator
    const activateRes = await authService.activate(provisionRes.activationToken, 'BootstrapSecure#2026');
    strict_1.default.equal(activateRes.success, true);
    strict_1.default.equal(activateRes.email, 'dedicated.bootstrap@orbyx.internal');
    // 5. Login successfully after activation
    const loginRes = await authService.login('dedicated.bootstrap@orbyx.internal', 'BootstrapSecure#2026');
    strict_1.default.ok(loginRes.accessToken);
    strict_1.default.ok(loginRes.refreshToken);
    strict_1.default.equal(loginRes.user.email, 'dedicated.bootstrap@orbyx.internal');
    strict_1.default.equal(loginRes.user.role, roles_1.UserRole.SUPER_ADMIN);
    strict_1.default.ok(loginRes.permissions.includes('system.config.write'));
    strict_1.default.ok(loginRes.permissions.includes('auth.users.manage'));
});
