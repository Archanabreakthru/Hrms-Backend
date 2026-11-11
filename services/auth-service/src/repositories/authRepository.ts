import { UserRole } from '../../../../shared/src/constants/roles';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED';
  employeeId?: string;
  departmentId?: string;
  clientId?: string;
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
  createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
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

