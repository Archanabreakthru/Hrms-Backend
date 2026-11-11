import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { IAuthRepository, UserRecord } from '../repositories/authRepository';
import { UserRole, ROLE_PERMISSIONS_MAP } from '../../../../shared/src/constants/roles';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../../../shared/src/errors/AppError';
import { JwtTokenPayload } from '../../../../shared/src/contracts/auth';

export class AuthService {
  constructor(private authRepo: IAuthRepository) {}

  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static verifyPassword(password: string, storedHash: string): boolean {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
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
    }
  ): Promise<Omit<UserRecord, 'passwordHash'>> {
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

