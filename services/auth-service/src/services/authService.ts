import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { IAuthRepository, UserRecord } from '../repositories/authRepository';
import { UserRole, ROLE_PERMISSIONS_MAP } from '../../../../shared/src/constants/roles';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../../../shared/src/errors/AppError';
import { JwtTokenPayload } from '../../../../shared/src/contracts/auth';

export class AuthService {
  constructor(private authRepo: IAuthRepository) {}

  static hashPassword(password: string, iterations = 100000): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return `${iterations}:${salt}:${hash}`;
  }

  static verifyPassword(password: string, storedHash: string): boolean {
    const parts = storedHash.split(':');
    let iterations = 100000;
    let salt = '';
    let key = '';

    if (parts.length === 3) {
      iterations = parseInt(parts[0], 10);
      salt = parts[1];
      key = parts[2];
    } else if (parts.length === 2) {
      salt = parts[0];
      key = parts[1];
      // Try 100k first, fallback to 10k for legacy compatibility
      const hash100k = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      if (crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash100k, 'hex'))) {
        return true;
      }
      iterations = 10000;
    } else {
      return false;
    }

    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  }

  generateAccessToken(user: UserRecord): string {
    const permissions = ROLE_PERMISSIONS_MAP[user.role] || [];
    const payload: JwtTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      departmentId: user.departmentId,
      clientId: user.clientId,
      permissions,
      iss: config.jwtIssuer,
      aud: config.jwtAudience,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.accessTokenExpiresIn as any,
      jwtid: crypto.randomUUID(),
    });
  }

  async login(
    email: string,
    password: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<{
    user: Omit<UserRecord, 'passwordHash'>;
    accessToken: string;
    refreshToken: string;
    permissions: string[];
  }> {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(`Account is ${user.status.toLowerCase()}`);
    }

    const isMatch = AuthService.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.refreshTokenExpiresInDays);

    await this.authRepo.createSession({
      tokenHash,
      refreshToken,
      userId: user.id,
      userType: user.role,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt,
    });

    const { passwordHash, ...userProfile } = user;
    const permissions = ROLE_PERMISSIONS_MAP[user.role] || [];

    return {
      user: userProfile,
      accessToken,
      refreshToken,
      permissions,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.authRepo.findSessionByRefreshToken(refreshToken);
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.authRepo.findUserById(session.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Associated user account is no longer active');
    }

    // Revoke old session (Rotation)
    await this.authRepo.revokeSession(refreshToken);

    // Issue new pair
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(newAccessToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.refreshTokenExpiresInDays);

    await this.authRepo.createSession({
      tokenHash,
      refreshToken: newRefreshToken,
      userId: user.id,
      userType: user.role,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authRepo.revokeSession(refreshToken);
  }

  async register(
    data: {
      email: string;
      password: string;
      role: UserRole;
      employeeId?: string;
      departmentId?: string;
      clientId?: string;
    },
    actor?: { role: UserRole; id: string }
  ): Promise<Omit<UserRecord, 'passwordHash'>> {
    // Role Escalation Prevention: HR Admin cannot grant super_admin or managing_director
    if (actor && actor.role !== UserRole.SUPER_ADMIN) {
      if (data.role === UserRole.SUPER_ADMIN) {
        throw new UnauthorizedError('Forbidden: Only Super Administrator can provision super_admin accounts');
      }
      if (data.role === UserRole.MANAGING_DIRECTOR) {
        throw new UnauthorizedError('Forbidden: Only Super Administrator can provision managing_director accounts');
      }
    }

    const existing = await this.authRepo.findUserByEmail(data.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = AuthService.hashPassword(data.password);
    const user = await this.authRepo.createUser({
      email: data.email,
      passwordHash,
      role: data.role,
      status: 'ACTIVE',
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      clientId: data.clientId,
    });

    const { passwordHash: _, ...profile } = user;
    return profile;
  }
}

