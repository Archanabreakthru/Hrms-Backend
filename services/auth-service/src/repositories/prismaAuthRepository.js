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
            isActive: raw.isActive ?? true,
            failedLoginAttempts: raw.failedLoginAttempts ?? 0,
            lockedUntil: raw.lockedUntil ?? null,
            invitationStatus: raw.invitationStatus ?? null,
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
    async findUserByEmployeeId(employeeId) {
        const raw = await this.prisma.users.findUnique({
            where: { employeeId },
        });
        return raw ? this.mapUser(raw) : null;
    }
    async findUserByActivationTokenHash(tokenHash) {
        const raw = await this.prisma.users.findFirst({
            where: { activationTokenHash: tokenHash },
        });
        return raw ? this.mapUser(raw) : null;
    }
    async updateUserActivation(userId, data) {
        const raw = await this.prisma.users.update({
            where: { id: userId },
            data: {
                passwordHash: data.passwordHash,
                status: data.status,
                invitationStatus: data.invitationStatus,
                activationTokenHash: null,
                activationTokenExpiresAt: null,
            },
        });
        return this.mapUser(raw);
    }
    async updateInvitationToken(userId, data) {
        const raw = await this.prisma.users.update({
            where: { id: userId },
            data: {
                activationTokenHash: data.activationTokenHash,
                activationTokenExpiresAt: data.activationTokenExpiresAt,
                invitationStatus: data.invitationStatus,
                invitationSentAt: data.invitationSentAt,
                invitationDeliveryAttempts: { increment: 1 },
            },
        });
        return this.mapUser(raw);
    }
    async getUserPermissions(userId, roleCode) {
        // 1. First look up user-specific role assignments from auth.user_roles
        const userRoles = await this.prisma.userRoles.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true },
                        },
                    },
                },
            },
        });
        const permsSet = new Set();
        for (const ur of userRoles) {
            if (ur.role && ur.role.permissions) {
                for (const rp of ur.role.permissions) {
                    if (rp.permission && rp.permission.code) {
                        permsSet.add(rp.permission.code);
                    }
                }
            }
        }
        // 2. If no direct user_roles exist or fallback required, query role by roleCode
        if (permsSet.size === 0 && roleCode) {
            const role = await this.prisma.roles.findUnique({
                where: { code: roleCode },
                include: {
                    permissions: {
                        include: { permission: true },
                    },
                },
            });
            if (role && role.permissions) {
                for (const rp of role.permissions) {
                    if (rp.permission && rp.permission.code) {
                        permsSet.add(rp.permission.code);
                    }
                }
            }
        }
        return Array.from(permsSet);
    }
    async recordLoginSuccess(userId) {
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
            },
        });
    }
    async recordLoginFailure(userId, currentFailedAttempts, lockUntil) {
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: currentFailedAttempts + 1,
                lockedUntil: lockUntil || null,
            },
        });
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
                activationTokenHash: user.activationTokenHash ?? null,
                activationTokenExpiresAt: user.activationTokenExpiresAt ?? null,
                invitationStatus: user.invitationStatus ?? null,
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
