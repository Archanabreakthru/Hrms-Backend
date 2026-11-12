import { PrismaClient, Prisma } from '../generated/client';
import { IAuthRepository, UserRecord, SessionRecord } from './authRepository';
import { UserRole } from '../../../../shared/src/constants/roles';

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private prisma: PrismaClient) {}

  private mapUser(raw: any): UserRecord {
    return {
      id: raw.id,
      email: raw.email,
      passwordHash: raw.passwordHash,
      role: raw.roleCode as UserRole,
      status: raw.status as 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED',
      employeeId: raw.employeeId ?? undefined,
      departmentId: raw.departmentId ?? undefined,
      clientId: raw.clientId ?? undefined,
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

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const raw = await this.prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    return raw ? this.mapUser(raw) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const raw = await this.prisma.users.findUnique({
      where: { id },
    });
    return raw ? this.mapUser(raw) : null;
  }

  async createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
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
}

