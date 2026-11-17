import { UserRole } from '../../../../shared/src/constants/roles';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'ACTIVE' | 'INVITED' | 'PENDING_ACTIVATION' | 'SUSPENDED' | 'DEACTIVATED' | 'DISABLED' | 'TERMINATED';
  employeeId?: string;
  departmentId?: string;
  clientId?: string;
  isActive?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  invitationStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  refreshToken: string;
  userId: string;
  userType: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmployeeId(employeeId: string): Promise<UserRecord | null>;
  findUserByActivationTokenHash(tokenHash: string): Promise<UserRecord | null>;
  getUserPermissions(userId: string, roleCode: string): Promise<string[]>;
  recordLoginSuccess(userId: string): Promise<void>;
  recordLoginFailure(userId: string, currentFailedAttempts: number, lockUntil?: Date | null): Promise<void>;
  createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    activationTokenHash?: string | null;
    activationTokenExpiresAt?: Date | null;
    invitationStatus?: string | null;
  }): Promise<UserRecord>;
  updateUserActivation(
    userId: string,
    data: {
      passwordHash: string;
      status: 'ACTIVE';
      invitationStatus: 'ACTIVATED';
      activationTokenHash: null;
      activationTokenExpiresAt: null;
    }
  ): Promise<UserRecord>;
  updateInvitationToken(
    userId: string,
    data: {
      activationTokenHash: string;
      activationTokenExpiresAt: Date;
      invitationStatus: 'SENT' | 'PENDING_INVITE';
      invitationSentAt: Date;
    }
  ): Promise<UserRecord>;
  createSession(session: Omit<SessionRecord, 'id' | 'createdAt' | 'updatedAt' | 'isRevoked'>): Promise<SessionRecord>;
  findSessionByRefreshToken(refreshToken: string): Promise<SessionRecord | null>;
  revokeSession(refreshToken: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
}

export class InMemoryAuthRepository implements IAuthRepository {
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, SessionRecord>();

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) return u;
    }
    return null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  async findUserByEmployeeId(employeeId: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.employeeId === employeeId) return u;
    }
    return null;
  }

  async findUserByActivationTokenHash(tokenHash: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if ((u as any).activationTokenHash === tokenHash) return u;
    }
    return null;
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
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.passwordHash = data.passwordHash;
    user.status = data.status;
    user.invitationStatus = data.invitationStatus;
    (user as any).activationTokenHash = null;
    (user as any).activationTokenExpiresAt = null;
    user.updatedAt = new Date();
    return user;
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
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    (user as any).activationTokenHash = data.activationTokenHash;
    (user as any).activationTokenExpiresAt = data.activationTokenExpiresAt;
    user.invitationStatus = data.invitationStatus;
    user.updatedAt = new Date();
    return user;
  }

  async getUserPermissions(userId: string, roleCode: string): Promise<string[]> {
    const { ROLE_PERMISSIONS_MAP } = require('../../../../shared/src/constants/roles');
    return ROLE_PERMISSIONS_MAP[roleCode as UserRole] || [];
  }

  async recordLoginSuccess(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }
  }

  async recordLoginFailure(userId: string, currentFailedAttempts: number, lockUntil?: Date | null): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.failedLoginAttempts = currentFailedAttempts + 1;
      user.lockedUntil = lockUntil || null;
    }
  }

  async createUser(userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const user: UserRecord = {
      ...userData,
      id,
      email: userData.email.toLowerCase().trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async createSession(
    sessionData: Omit<SessionRecord, 'id' | 'createdAt' | 'updatedAt' | 'isRevoked'>
  ): Promise<SessionRecord> {
    const id = `ses-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const session: SessionRecord = {
      ...sessionData,
      id,
      isRevoked: false,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.refreshToken, session);
    return session;
  }

  async findSessionByRefreshToken(refreshToken: string): Promise<SessionRecord | null> {
    return this.sessions.get(refreshToken) || null;
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const session = this.sessions.get(refreshToken);
    if (session) {
      session.isRevoked = true;
      session.updatedAt = new Date();
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    for (const s of this.sessions.values()) {
      if (s.userId === userId) {
        s.isRevoked = true;
        s.updatedAt = new Date();
      }
    }
  }
}

