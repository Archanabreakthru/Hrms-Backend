import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/services/authService';
import { InMemoryAuthRepository } from '../src/repositories/authRepository';
import { UserRole } from '../../../shared/src/constants/roles';

test('AuthService registers a user, hashes password, and successfully authenticates', async () => {
  const repo = new InMemoryAuthRepository();
  const service = new AuthService(repo);

  const user = await service.register({
    email: 'hr@orbyx.internal',
    password: 'Password123!',
    role: UserRole.HR_ADMIN,
    employeeId: 'EMP-HRM-0001',
  });

  assert.equal(user.email, 'hr@orbyx.internal');
  assert.equal(user.role, UserRole.HR_ADMIN);

  // Successful login
  const loginResult = await service.login('hr@orbyx.internal', 'Password123!');
  assert.ok(loginResult.accessToken);
  assert.ok(loginResult.refreshToken);
  assert.ok(loginResult.permissions.includes('payroll.process'));
  assert.ok(loginResult.permissions.includes('employee.profile.read_all'));
  // Ensure HR admin doesn't have client portal login
  assert.ok(!loginResult.permissions.includes('client.portal.login'));

  // Invalid password rejects
  await assert.rejects(
    async () => {
      await service.login('hr@orbyx.internal', 'WrongPassword!');
    },
    {
      name: 'UnauthorizedError',
      message: 'Invalid email or password',
    }
  );
});

test('AuthService refreshes token with automatic session rotation', async () => {
  const repo = new InMemoryAuthRepository();
  const service = new AuthService(repo);

  await service.register({
    email: 'emp@orbyx.internal',
    password: 'Password123!',
    role: UserRole.EMPLOYEE,
    employeeId: 'EMP-SWE-0002',
  });

  const { refreshToken: oldRefreshToken } = await service.login('emp@orbyx.internal', 'Password123!');

  const refreshResult = await service.refresh(oldRefreshToken);
  assert.ok(refreshResult.accessToken);
  assert.ok(refreshResult.refreshToken);
  assert.notEqual(refreshResult.refreshToken, oldRefreshToken);

  // Using old refresh token again is rejected (rotated out)
  await assert.rejects(
    async () => {
      await service.refresh(oldRefreshToken);
    },
    {
      name: 'UnauthorizedError',
    }
  );
});

test('AuthService Client Supervisor login receives tenant-isolated permissions', async () => {
  const repo = new InMemoryAuthRepository();
  const service = new AuthService(repo);

  await service.register({
    email: 'supervisor@acme.com',
    password: 'SupervisorPass123!',
    role: UserRole.CLIENT_SUPERVISOR,
    clientId: 'CLI-001',
  });

  const loginResult = await service.login('supervisor@acme.com', 'SupervisorPass123!');
  assert.equal(loginResult.user.clientId, 'CLI-001');
  assert.ok(loginResult.permissions.includes('client.portal.login'));
  assert.ok(loginResult.permissions.includes('client.attendance.verify_deployed'));

  // Strict tenant restriction: zero internal permissions
  assert.ok(!loginResult.permissions.includes('employee.profile.read_all'));
  assert.ok(!loginResult.permissions.includes('payroll.process'));
  assert.ok(!loginResult.permissions.includes('system.config.write'));
});

