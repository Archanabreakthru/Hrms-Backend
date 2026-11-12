import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma, disconnectPrisma } from '../src/lib/prisma';
import { PrismaAuthRepository } from '../src/repositories/prismaAuthRepository';
import { UserRole } from '../../../shared/src/constants/roles';

test('PrismaAuthRepository - Database Integration Test', async (t) => {
  const repo = new PrismaAuthRepository(prisma);

  // Active database connectivity probe
  await t.test('database is reachable', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    assert.ok(result);
  });

  const testEmail = `test_${Date.now()}@orbyx.test`;
  let createdUserId: string;

  await t.test('creates user in auth.users and retrieves it', async () => {
    const created = await repo.createUser({
      email: testEmail,
      passwordHash: 'hashed_pw_test',
      role: UserRole.EMPLOYEE,
      status: 'ACTIVE',
    });

    assert.ok(created.id);
    assert.equal(created.email, testEmail);
    assert.equal(created.role, UserRole.EMPLOYEE);
    createdUserId = created.id;

    const fetched = await repo.findUserByEmail(testEmail);
    assert.ok(fetched);
    assert.equal(fetched.id, createdUserId);
  });

  await t.test('creates session in auth.auth_sessions and handles revocation', async () => {
    const refreshToken = `ref_token_${Date.now()}`;
    const tokenHash = `token_hash_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600000);

    const session = await repo.createSession({
      tokenHash,
      refreshToken,
      userId: createdUserId,
      userType: 'EMPLOYEE',
      expiresAt,
    });

    assert.ok(session.id);
    assert.equal(session.refreshToken, refreshToken);
    assert.equal(session.isRevoked, false);

    const found = await repo.findSessionByRefreshToken(refreshToken);
    assert.ok(found);
    assert.equal(found.isRevoked, false);

    await repo.revokeSession(refreshToken);
    const revoked = await repo.findSessionByRefreshToken(refreshToken);
    assert.ok(revoked);
    assert.equal(revoked.isRevoked, true);
  });

  // Cleanup created test records
  await t.test('cleanup test user and sessions', async () => {
    await prisma.authSessions.deleteMany({ where: { userId: createdUserId } });
    await prisma.users.delete({ where: { id: createdUserId } });
    const after = await repo.findUserById(createdUserId);
    assert.equal(after, null);
  });

  t.after(async () => {
    await disconnectPrisma();
  });
});

