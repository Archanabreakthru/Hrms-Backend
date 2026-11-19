"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAuthRepository = void 0;
const roles_1 = require("../../../../shared/src/constants/roles");
const AppError_1 = require("../../../../shared/src/errors/AppError");
class PrismaAuthRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapUser(raw) {
        return {
            id: raw.id,
            email: raw.email,
            username: raw.username ?? undefined,
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
    async findUserByEmail(emailOrUsername) {
        const term = emailOrUsername.toLowerCase().trim();
        const isBootstrapAlias = term === 'bootstrap administrator' ||
            term === 'bootstrap_administrator' ||
            term === 'bootstrap admin' ||
            term === 'bootstrap_admin' ||
            term === 'bootstrapadmin' ||
            term === 'bootstrapadministrator';
        const raw = await this.prisma.users.findFirst({
            where: {
                OR: [
                    { email: term },
                    { username: term },
                    ...(isBootstrapAlias ? [{ username: 'bootstrap_admin' }, { roleCode: 'super_admin' }] : [])
                ]
            },
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
        // 0. Super Administrator has unconditional access to all permissions across all modules
        if (roleCode === 'super_admin' || roleCode === roles_1.UserRole.SUPER_ADMIN) {
            const allPerms = await this.prisma.permissions.findMany({ select: { code: true } });
            return allPerms.map((p) => p.code);
        }
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
    async findAllUsers() {
        const rawList = await this.prisma.users.findMany({
            orderBy: { createdAt: 'asc' },
        });
        return rawList.map((r) => this.mapUser(r));
    }
    async updateUserRole(userId, newRoleCode) {
        // Protect Bootstrap Administrator from accidental demotion or privilege alteration
        const targetUser = await this.prisma.users.findUnique({ where: { id: userId } });
        if (targetUser && (targetUser.username === 'bootstrap_admin' || targetUser.email === 'arunarchana2034@gmail.com')) {
            if (newRoleCode !== roles_1.UserRole.SUPER_ADMIN && newRoleCode !== 'super_admin') {
                throw new AppError_1.ForbiddenError('The Bootstrap Administrator account is protected and cannot be demoted from Super Administrator.');
            }
        }
        const raw = await this.prisma.users.update({
            where: { id: userId },
            data: { roleCode: newRoleCode },
        });
        try {
            const roleRow = await this.prisma.roles.findUnique({
                where: { code: newRoleCode },
            });
            if (roleRow) {
                const existingUR = await this.prisma.userRoles.findFirst({
                    where: { userId },
                });
                if (existingUR) {
                    await this.prisma.userRoles.update({
                        where: { id: existingUR.id },
                        data: { roleId: roleRow.id },
                    });
                }
                else {
                    await this.prisma.userRoles.create({
                        data: { userId, roleId: roleRow.id },
                    });
                }
            }
        }
        catch {
            // Non-blocking
        }
        return this.mapUser(raw);
    }
    // --- Dynamic Role Management Operations ---
    async listRoles() {
        const roles = await this.prisma.roles.findMany({
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        return roles.map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            isSystemRole: r.isSystemRole,
            permissions: r.permissions.map((p) => p.permission.code),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
    }
    async findRoleByCode(code) {
        const r = await this.prisma.roles.findUnique({
            where: { code },
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
        });
        if (!r)
            return null;
        return {
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            isSystemRole: r.isSystemRole,
            permissions: r.permissions.map((p) => p.permission.code),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        };
    }
    async createRole(data) {
        const code = data.code.toLowerCase().trim();
        const existing = await this.prisma.roles.findUnique({ where: { code } });
        if (existing) {
            throw new AppError_1.ConflictError(`Role with code '${code}' already exists`);
        }
        const role = await this.prisma.roles.create({
            data: {
                code,
                name: data.name.trim(),
                description: data.description || '',
                isSystemRole: false,
            },
        });
        if (data.permissionCodes && data.permissionCodes.length > 0) {
            const perms = await this.prisma.permissions.findMany({
                where: { code: { in: data.permissionCodes } },
            });
            for (const p of perms) {
                await this.prisma.rolePermissions.create({
                    data: {
                        roleId: role.id,
                        permissionId: p.id,
                    },
                });
            }
        }
        return this.findRoleByCode(role.code);
    }
    async updateRole(code, data) {
        const role = await this.prisma.roles.findUnique({ where: { code } });
        if (!role)
            throw new Error(`Role ${code} not found`);
        await this.prisma.roles.update({
            where: { id: role.id },
            data: {
                name: data.name ? data.name.trim() : undefined,
                description: data.description !== undefined ? data.description : undefined,
            },
        });
        if (data.permissionCodes) {
            await this.prisma.rolePermissions.deleteMany({ where: { roleId: role.id } });
            const perms = await this.prisma.permissions.findMany({
                where: { code: { in: data.permissionCodes } },
            });
            for (const p of perms) {
                await this.prisma.rolePermissions.create({
                    data: {
                        roleId: role.id,
                        permissionId: p.id,
                    },
                });
            }
        }
        return this.findRoleByCode(code);
    }
    async deleteRole(code) {
        const role = await this.prisma.roles.findUnique({ where: { code } });
        if (!role)
            throw new Error(`Role ${code} not found`);
        if (role.isSystemRole || ['super_admin', 'hr_admin', 'employee', 'client_supervisor'].includes(role.code)) {
            throw new AppError_1.ForbiddenError(`System role '${code}' cannot be deleted.`);
        }
        await this.prisma.rolePermissions.deleteMany({ where: { roleId: role.id } });
        await this.prisma.userRoles.deleteMany({ where: { roleId: role.id } });
        await this.prisma.roles.delete({ where: { id: role.id } });
        return true;
    }
    async listAllPermissions() {
        return this.prisma.permissions.findMany({
            orderBy: [{ module: 'asc' }, { code: 'asc' }],
        });
    }
}
exports.PrismaAuthRepository = PrismaAuthRepository;
