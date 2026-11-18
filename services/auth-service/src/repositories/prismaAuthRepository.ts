import { PrismaClient, Prisma } from '../generated/client';
import { IAuthRepository, UserRecord, SessionRecord } from './authRepository';
import { UserRole } from '../../../../shared/src/constants/roles';

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private prisma: PrismaClient) {}

  private mapUser(raw: any): UserRecord {
    return {
      id: raw.id,
      email: raw.email,
      username: raw.username ?? undefined,
      passwordHash: raw.passwordHash,
      role: raw.roleCode as UserRole,
      status: raw.status as any,
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

  private mapSession(raw: any): SessionRecord {
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

  async findUserByEmail(emailOrUsername: string): Promise<UserRecord | null> {
    const term = emailOrUsername.toLowerCase().trim();
    const raw = await this.prisma.users.findFirst({
      where: {
        OR: [
          { email: term },
          { username: term }
        ]
      },
    });
    return raw ? this.mapUser(raw) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const raw = await this.prisma.users.findUnique({
      where: { id },
    });
    return raw ? this.mapUser(raw) : null;
  }

  async findUserByEmployeeId(employeeId: string): Promise<UserRecord | null> {
    const raw = await this.prisma.users.findUnique({
      where: { employeeId },
    });
    return raw ? this.mapUser(raw) : null;
  }

  async findUserByActivationTokenHash(tokenHash: string): Promise<UserRecord | null> {
    const raw = await this.prisma.users.findFirst({
      where: { activationTokenHash: tokenHash },
    });
    return raw ? this.mapUser(raw) : null;
  }

  async updateUserActivation(
    userId: string,
    data: {
      passwordHash: string;
      status: 'ACTIVE';
      invitationStatus: 'ACTIVATED';
      activationTokenHash: null;
      activationTokenExpiresAt: null;
    }
  ): Promise<UserRecord> {
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

  async updateInvitationToken(
    userId: string,
    data: {
      activationTokenHash: string;
      activationTokenExpiresAt: Date;
      invitationStatus: 'SENT' | 'PENDING_INVITE';
      invitationSentAt: Date;
    }
  ): Promise<UserRecord> {
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

  async getUserPermissions(userId: string, roleCode: string): Promise<string[]> {
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

    const permsSet = new Set<string>();

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

  async recordLoginSuccess(userId: string): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }

  async recordLoginFailure(userId: string, currentFailedAttempts: number, lockUntil?: Date | null): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: currentFailedAttempts + 1,
        lockedUntil: lockUntil || null,
      },
    });
  }

  async createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    activationTokenHash?: string | null;
    activationTokenExpiresAt?: Date | null;
    invitationStatus?: string | null;
  }): Promise<UserRecord> {
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

  async createSession(
    session: Omit<SessionRecord, 'id' | 'createdAt' | 'updatedAt' | 'isRevoked'>
  ): Promise<SessionRecord> {
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

  async findSessionByRefreshToken(refreshToken: string): Promise<SessionRecord | null> {
    const raw = await this.prisma.authSessions.findUnique({
      where: { refreshToken },
    });
    return raw ? this.mapSession(raw) : null;
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await this.prisma.authSessions.updateMany({
      where: { refreshToken },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.authSessions.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async findAllUsers(): Promise<UserRecord[]> {
    const rawList = await this.prisma.users.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rawList.map((r) => this.mapUser(r));
  }

  async updateUserRole(userId: string, newRoleCode: string): Promise<UserRecord> {
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
        } else {
          await this.prisma.userRoles.create({
            data: { userId, roleId: roleRow.id },
          });
        }
      }
    } catch {
      // Non-blocking
    }

    return this.mapUser(raw);
  }
}

