import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  bootstrapHrAdministrator,
  bootstrapDedicatedAdministrator,
  IBootstrapDatabaseClient
} from '../src/services/bootstrapService';
import { AuthService } from '../src/services/authService';
import { IAuthRepository, UserRecord, SessionRecord } from '../src/repositories/authRepository';
import { UserRole } from '../../../shared/src/constants/roles';

/**
 * Isolated In-Memory Database Simulator for Concurrency & Bootstrap Testing
 */
class IsolatedBootstrapDbSimulator implements IBootstrapDatabaseClient, IAuthRepository {
  public usersMap = new Map<string, any>();
  public rolesMap = new Map<string, any>();
  public userRolesList: any[] = [];
  public sessionsMap = new Map<string, any>();
  public advisoryLockHeld = false;

  constructor() {
    // Seed standard HR_ADMIN role
    this.rolesMap.set(UserRole.HR_ADMIN, {
      id: 'role-uuid-hr-admin',
      code: UserRole.HR_ADMIN,
      name: 'HR Administrator',
      permissions: [
        { permission: { code: 'org.profile.read' } },
        { permission: { code: 'org.profile.manage' } },
        { permission: { code: 'auth.users.manage' } },
      ],
    });

    // Seed standard SUPER_ADMIN role
    this.rolesMap.set(UserRole.SUPER_ADMIN, {
      id: 'role-uuid-super-admin',
      code: UserRole.SUPER_ADMIN,
      name: 'Super Administrator',
      permissions: [
        { permission: { code: 'system.config.read' } },
        { permission: { code: 'system.config.write' } },
        { permission: { code: 'auth.users.manage' } },
      ],
    });
  }

  async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return await fn(this);
  }

  async $executeRawUnsafe(sql: string): Promise<any> {
    if (sql.includes('pg_advisory_xact_lock')) {
      if (this.advisoryLockHeld) {
        throw new Error('Lock acquisition failed: Concurrent bootstrap transaction in progress');
      }
      this.advisoryLockHeld = true;
    }
    return 1;
  }

  users = {
    findFirst: async (args: any) => {
      for (const u of this.usersMap.values()) {
        if (args.where?.username && u.username !== args.where.username) continue;
        if (args.where?.roleCode && u.roleCode !== args.where.roleCode) continue;
        if (args.where?.status?.in && !args.where.status.in.includes(u.status)) continue;
        return { ...u };
      }
      return null;
    },
    findUnique: async (args: any) => {
      if (args.where?.email) {
        for (const u of this.usersMap.values()) {
          if (u.email.toLowerCase() === args.where.email.toLowerCase()) return { ...u };
        }
      }
      if (args.where?.id) {
        const u = this.usersMap.get(args.where.id);
        return u ? { ...u } : null;
      }
      return null;
    },
    create: async (args: any) => {
      const id = 'usr-' + crypto.randomBytes(8).toString('hex');
      const record = {
        id,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.usersMap.set(id, record);
      return { ...record };
    },
    update: async (args: any) => {
      const existing = this.usersMap.get(args.where.id);
      if (!existing) throw new Error('User not found');
      const updated = { ...existing, ...args.data, updatedAt: new Date() };
      this.usersMap.set(args.where.id, updated);
      return { ...updated };
    },
  };

  roles = {
    findUnique: async (args: any) => {
      const r = this.rolesMap.get(args.where.code);
      return r ? { ...r } : null;
    },
  };

  userRoles = {
    create: async (args: any) => {
      const record = { id: 'ur-' + crypto.randomBytes(4).toString('hex'), ...args.data };
      this.userRolesList.push(record);
      return record;
    },
  };

  serviceNonces = {
    create: async () => ({ nonce: 'nonce-1' }),
  };

  // --- IAuthRepository methods for AuthService activation & login tests ---
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    for (const u of this.usersMap.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return this.mapToUserRecord(u);
      }
    }
    return null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const u = this.usersMap.get(id);
    return u ? this.mapToUserRecord(u) : null;
  }

  async findUserByEmployeeId(): Promise<UserRecord | null> {
    return null;
  }

  async findUserByActivationTokenHash(tokenHash: string): Promise<UserRecord | null> {
    for (const u of this.usersMap.values()) {
      if (u.activationTokenHash === tokenHash) {
        return this.mapToUserRecord(u);
      }
    }
    return null;
  }

  async getUserPermissions(userId: string, roleCode: string): Promise<string[]> {
    const role = this.rolesMap.get(roleCode);
    if (!role) return [];
    return role.permissions.map((p: any) => p.permission.code);
  }

  async recordLoginSuccess(userId: string): Promise<void> {
    const u = this.usersMap.get(userId);
    if (u) {
      u.failedLoginAttempts = 0;
      u.lockedUntil = null;
      u.lastLoginAt = new Date();
    }
  }

  async recordLoginFailure(userId: string, currentFailedAttempts: number): Promise<void> {
    const u = this.usersMap.get(userId);
    if (u) {
      u.failedLoginAttempts = currentFailedAttempts + 1;
    }
  }

  async createUser(user: any): Promise<UserRecord> {
    const id = 'usr-' + crypto.randomBytes(8).toString('hex');
    const record = { id, ...user, createdAt: new Date(), updatedAt: new Date() };
    this.usersMap.set(id, record);
    return this.mapToUserRecord(record);
  }

  async updateUserActivation(userId: string, data: any): Promise<UserRecord> {
    const u = this.usersMap.get(userId);
    if (!u) throw new Error('User not found');
    Object.assign(u, data);
    return this.mapToUserRecord(u);
  }

  async createSession(session: any): Promise<SessionRecord> {
    const id = 'sess-' + crypto.randomBytes(8).toString('hex');
    const rec = { id, ...session, createdAt: new Date(), updatedAt: new Date() };
    this.sessionsMap.set(rec.refreshToken, rec);
    return rec;
  }

  async findSessionByRefreshToken(refreshToken: string): Promise<SessionRecord | null> {
    return this.sessionsMap.get(refreshToken) || null;
  }

  async revokeSession(id: string): Promise<void> {
    for (const s of this.sessionsMap.values()) {
      if (s.id === id) s.isRevoked = true;
    }
  }

  async revokeAllUserSessions(): Promise<void> {}
  async updateInvitationToken(): Promise<UserRecord> { throw new Error('Not implemented'); }

  private mapToUserRecord(raw: any): UserRecord {
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

test('1. Fresh installation: bootstrap successfully provisions first HR Admin with unactivated status', async () => {
  const db = new IsolatedBootstrapDbSimulator();

  const res = await bootstrapHrAdministrator(db, {
    email: 'admin.first@celestial.internal',
    name: 'Initial HR Administrator',
  });

  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.email, 'admin.first@celestial.internal');
  assert.equal(res.role, UserRole.HR_ADMIN);
  assert.ok(res.activationToken);
  assert.ok(res.activationUrl?.includes(res.activationToken));

  // Verify database record
  const savedUser = db.usersMap.get(res.userId!);
  assert.ok(savedUser);
  assert.equal(savedUser.status, 'PENDING_ACTIVATION');
  assert.equal(savedUser.invitationStatus, 'PENDING_ACTIVATION');
  
  // Verify passwordHash is NOT plaintext and contains high-entropy unactivated salt:key pair
  assert.ok(savedUser.passwordHash.includes(':'));
  assert.ok(!savedUser.passwordHash.includes('PENDING_BOOTSTRAP_ACTIVATION'));
  assert.equal(savedUser.passwordHash.split(':')[0].length, 32); // 16 bytes hex salt

  // Verify role relationship in user_roles
  assert.equal(db.userRolesList.length, 1);
  assert.equal(db.userRolesList[0].userId, res.userId);
  assert.equal(db.userRolesList[0].roleId, 'role-uuid-hr-admin');
});

test('2. Concurrency & Idempotency: Second bootstrap attempt safely aborts without creating duplicate admin', async () => {
  const db = new IsolatedBootstrapDbSimulator();

  // First run succeeds
  const first = await bootstrapHrAdministrator(db, { email: 'admin.first@celestial.internal' });
  assert.equal(first.status, 'SUCCESS');

  // Second run with a different email
  const second = await bootstrapHrAdministrator(db, { email: 'admin.second@celestial.internal' });
  assert.equal(second.status, 'ALREADY_INITIALIZED');
  assert.equal(second.existingAdminEmail, 'admin.first@celestial.internal');
  assert.ok(second.message.includes('already initialized'));

  // Database must still have exactly 1 user
  assert.equal(db.usersMap.size, 1);
});

test('3. Preservation of existing environment (e.g. Raseedh): bootstrap detects existing active admin and halts', async () => {
  const db = new IsolatedBootstrapDbSimulator();

  // Simulate existing database with Raseedh
  db.usersMap.set('raseedh-uuid', {
    id: 'raseedh-uuid',
    email: 'raseedh@orbyx.internal',
    roleCode: UserRole.HR_ADMIN,
    status: 'ACTIVE',
    employeeId: 'EMP-HRM-0012',
    isActive: true,
  });

  const res = await bootstrapHrAdministrator(db, { email: 'new.candidate@celestial.internal' });

  assert.equal(res.status, 'ALREADY_INITIALIZED');
  assert.equal(res.existingAdminEmail, 'raseedh@orbyx.internal');
  assert.equal(db.usersMap.size, 1);
  assert.ok(db.usersMap.has('raseedh-uuid'));
});

test('4. Security gate: Login is explicitly rejected when account is PENDING_ACTIVATION', async () => {
  const db = new IsolatedBootstrapDbSimulator();
  const authService = new AuthService(db);

  // Bootstrap account
  const bootRes = await bootstrapHrAdministrator(db, { email: 'admin.pending@celestial.internal' });
  assert.equal(bootRes.status, 'SUCCESS');

  // Attempt to login before activation
  await assert.rejects(
    async () => {
      await authService.login('admin.pending@celestial.internal', 'AnyPassword123!');
    },
    {
      name: 'UnauthorizedError',
      message: 'Account pending activation. Please use the activation link sent to your registered email.',
    }
  );
});

test('5. Full Activation & Authenticated Login Workflow with Role Permissions', async () => {
  const db = new IsolatedBootstrapDbSimulator();
  const authService = new AuthService(db);

  // 1. Operator bootstraps first admin
  const bootRes = await bootstrapHrAdministrator(db, { email: 'admin.active@celestial.internal' });
  assert.equal(bootRes.status, 'SUCCESS');
  const token = bootRes.activationToken!;

  // 2. Admin activates account and sets secure password
  const actRes = await authService.activate(token, 'CelestialSecure#2026');
  assert.equal(actRes.success, true);
  assert.equal(actRes.email, 'admin.active@celestial.internal');

  // User state in DB transitions to ACTIVE and activated
  const activatedUser = db.usersMap.get(bootRes.userId!);
  assert.equal(activatedUser.status, 'ACTIVE');
  assert.equal(activatedUser.invitationStatus, 'ACTIVATED');
  assert.equal(activatedUser.activationTokenHash, null);

  // 3. Login with newly activated credentials
  const loginRes = await authService.login('admin.active@celestial.internal', 'CelestialSecure#2026');
  assert.ok(loginRes.accessToken);
  assert.ok(loginRes.refreshToken);
  assert.equal(loginRes.user.email, 'admin.active@celestial.internal');
  assert.equal(loginRes.user.role, UserRole.HR_ADMIN);

  // Verify database-backed permissions for HR Administrator
  assert.ok(loginRes.permissions.includes('org.profile.manage'));
  assert.ok(loginRes.permissions.includes('org.profile.read'));
  assert.ok(loginRes.permissions.includes('auth.users.manage'));

  // 4. Token Reuse Prevention: Attempting to activate again with the used token must fail
  await assert.rejects(
    async () => {
      await authService.activate(token, 'AnotherPassword#999');
    },
    {
      name: 'UnauthorizedError',
      message: 'Invalid or expired activation link',
    }
  );

  // 5. Wrong password rejected
  await assert.rejects(
    async () => {
      await authService.login('admin.active@celestial.internal', 'WrongPassword!');
    },
    {
      name: 'UnauthorizedError',
      message: 'Invalid email or password',
    }
  );
});

test('Dedicated Bootstrap Administrator: provisions separate account alongside existing users, activates, and logs in', async () => {
  const db = new IsolatedBootstrapDbSimulator();
  const authService = new AuthService(db);

  // Prepopulate existing Raseedh and existing Super Admin
  db.usersMap.set('user-existing-raseedh', {
    id: 'user-existing-raseedh',
    email: 'raseedh@orbyx.internal',
    passwordHash: 'PBKDF2$salt$hash',
    roleCode: UserRole.HR_ADMIN,
    status: 'ACTIVE',
    employeeId: 'EMP-HRM-0012',
    isActive: true,
  });

  db.usersMap.set('user-existing-superadmin', {
    id: 'user-existing-superadmin',
    email: 'admin.system@orbyx.internal',
    passwordHash: 'PBKDF2$salt$hash',
    roleCode: UserRole.SUPER_ADMIN,
    status: 'ACTIVE',
    isActive: true,
  });

  const initialCount = db.usersMap.size;
  assert.equal(initialCount, 2);

  // 1. Provision dedicated bootstrap administrator
  const provisionRes = await bootstrapDedicatedAdministrator(
    db,
    {
      email: 'dedicated.bootstrap@orbyx.internal',
      authorizedBy: 'admin.system@orbyx.internal',
    },
    { portalBaseUrl: 'https://hrms.orbyx.internal' }
  );

  assert.equal(provisionRes.status, 'SUCCESS');
  assert.ok(provisionRes.userId);
  assert.equal(provisionRes.email, 'dedicated.bootstrap@orbyx.internal');
  assert.equal(provisionRes.role, UserRole.SUPER_ADMIN);
  assert.ok(provisionRes.activationToken);
  assert.ok(provisionRes.activationUrl?.includes('/#/activate?token='));

  // Verify total users incremented by exactly 1
  assert.equal(db.usersMap.size, 3);

  // Verify existing users remain completely untouched
  const raseedh = db.usersMap.get('user-existing-raseedh');
  assert.equal(raseedh.email, 'raseedh@orbyx.internal');
  assert.equal(raseedh.status, 'ACTIVE');

  const existingSuper = db.usersMap.get('user-existing-superadmin');
  assert.equal(existingSuper.email, 'admin.system@orbyx.internal');
  assert.equal(existingSuper.status, 'ACTIVE');

  // 2. Reject duplicate provisioning
  const duplicateRes = await bootstrapDedicatedAdministrator(
    db,
    {
      email: 'another.bootstrap@orbyx.internal',
      authorizedBy: 'admin.system@orbyx.internal',
    }
  );
  assert.equal(duplicateRes.status, 'ALREADY_INITIALIZED');
  assert.equal(db.usersMap.size, 3); // Unchanged

  // 3. Login attempt while PENDING_ACTIVATION must be rejected
  await assert.rejects(
    async () => {
      await authService.login('dedicated.bootstrap@orbyx.internal', 'AnyPassword123!');
    },
    {
      name: 'UnauthorizedError',
      message: 'Account pending activation. Please use the activation link sent to your registered email.',
    }
  );

  // 4. Activate dedicated bootstrap administrator
  const activateRes = await authService.activate(provisionRes.activationToken!, 'BootstrapSecure#2026');
  assert.equal(activateRes.success, true);
  assert.equal(activateRes.email, 'dedicated.bootstrap@orbyx.internal');

  // 5. Login successfully after activation
  const loginRes = await authService.login('dedicated.bootstrap@orbyx.internal', 'BootstrapSecure#2026');
  assert.ok(loginRes.accessToken);
  assert.ok(loginRes.refreshToken);
  assert.equal(loginRes.user.email, 'dedicated.bootstrap@orbyx.internal');
  assert.equal(loginRes.user.role, UserRole.SUPER_ADMIN);
  assert.ok(loginRes.permissions.includes('system.config.write'));
  assert.ok(loginRes.permissions.includes('auth.users.manage'));
});


