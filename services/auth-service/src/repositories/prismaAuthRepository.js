"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAuthRepository = void 0;
class PrismaAuthRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapUser(raw) {
        return {
            id: raw.id,
            email: raw.email,
            passwordHash: raw.passwordHash,
            role: raw.roleCode,
            status: raw.status,
            employeeId: raw.employeeId ?? undefined,
            departmentId: raw.departmentId ?? undefined,
            clientId: raw.clientId ?? undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
    mapSession(raw) {
        return {
            id: raw.id,
            tokenHash: raw.tokenHash,
            refreshToken: raw.refreshToken,
            userId: raw.userId,
            userType: raw.userType,
            userAgent: raw.userAgent ?? undefined,
            ipAddress: raw.ipAddress ?? undefined,
            expiresAt: raw.expiresAt,
            isRevoked: raw.isRevoked,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
    async findUserByEmail(email) {
        const raw = await this.prisma.users.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        return raw ? this.mapUser(raw) : null;
    }
    async findUserById(id) {
        const raw = await this.prisma.users.findUnique({
            where: { id },
        });
        return raw ? this.mapUser(raw) : null;
    }
    async createUser(user) {
        const raw = await this.prisma.users.create({
            data: {
                email: user.email.toLowerCase().trim(),
                passwordHash: user.passwordHash,
                roleCode: user.role,
                status: user.status,
                employeeId: user.employeeId ?? null,
                departmentId: user.departmentId ?? null,
                clientId: user.clientId ?? null,
            },
        });
        return this.mapUser(raw);
    }
    async createSession(session) {
        const raw = await this.prisma.authSessions.create({
            data: {
                tokenHash: session.tokenHash,
                refreshToken: session.refreshToken,
                userId: session.userId,
                userType: session.userType,
                userAgent: session.userAgent ?? null,
                ipAddress: session.ipAddress ?? null,
                expiresAt: session.expiresAt,
                isRevoked: false,
            },
        });
        return this.mapSession(raw);
    }
    async findSessionByRefreshToken(refreshToken) {
        const raw = await this.prisma.authSessions.findUnique({
            where: { refreshToken },
        });
        return raw ? this.mapSession(raw) : null;
    }
    async revokeSession(refreshToken) {
        await this.prisma.authSessions.updateMany({
            where: { refreshToken },
            data: { isRevoked: true },
        });
    }
    async revokeAllUserSessions(userId) {
        await this.prisma.authSessions.updateMany({
            where: { userId },
            data: { isRevoked: true },
        });
    }
}
exports.PrismaAuthRepository = PrismaAuthRepository;
