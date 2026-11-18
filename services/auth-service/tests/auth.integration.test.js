"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const prisma_1 = require("../src/lib/prisma");
const prismaAuthRepository_1 = require("../src/repositories/prismaAuthRepository");
const roles_1 = require("../../../shared/src/constants/roles");
(0, node_test_1.default)('PrismaAuthRepository - Database Integration Test', async (t) => {
    const repo = new prismaAuthRepository_1.PrismaAuthRepository(prisma_1.prisma);
    // Active database connectivity probe
    await t.test('database is reachable', async () => {
        const result = await prisma_1.prisma.$queryRaw `SELECT 1 as connected`;
        strict_1.default.ok(result);
    });
    const testEmail = `test_${Date.now()}@orbyx.test`;
    let createdUserId;
    await t.test('creates user in auth.users and retrieves it', async () => {
        const created = await repo.createUser({
            email: testEmail,
            passwordHash: 'hashed_pw_test',
            role: roles_1.UserRole.EMPLOYEE,
            status: 'ACTIVE',
        });
        strict_1.default.ok(created.id);
        strict_1.default.equal(created.email, testEmail);
        strict_1.default.equal(created.role, roles_1.UserRole.EMPLOYEE);
        createdUserId = created.id;
        const fetched = await repo.findUserByEmail(testEmail);
        strict_1.default.ok(fetched);
        strict_1.default.equal(fetched.id, createdUserId);
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
        strict_1.default.ok(session.id);
        strict_1.default.equal(session.refreshToken, refreshToken);
        strict_1.default.equal(session.isRevoked, false);
        const found = await repo.findSessionByRefreshToken(refreshToken);
        strict_1.default.ok(found);
        strict_1.default.equal(found.isRevoked, false);
        await repo.revokeSession(refreshToken);
        const revoked = await repo.findSessionByRefreshToken(refreshToken);
        strict_1.default.ok(revoked);
        strict_1.default.equal(revoked.isRevoked, true);
    });
    // Cleanup created test records
    await t.test('cleanup test user and sessions', async () => {
        await prisma_1.prisma.authSessions.deleteMany({ where: { userId: createdUserId } });
        await prisma_1.prisma.users.delete({ where: { id: createdUserId } });
        const after = await repo.findUserById(createdUserId);
        strict_1.default.equal(after, null);
    });
    t.after(async () => {
        await (0, prisma_1.disconnectPrisma)();
    });
});
