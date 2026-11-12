"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const roles_1 = require("../../../../shared/src/constants/roles");
const AppError_1 = require("../../../../shared/src/errors/AppError");
class AuthService {
    authRepo;
    constructor(authRepo) {
        this.authRepo = authRepo;
    }
    static hashPassword(password, iterations = 100000) {
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = crypto_1.default.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
        return `${iterations}:${salt}:${hash}`;
    }
    static verifyPassword(password, storedHash) {
        const parts = storedHash.split(':');
        let iterations = 100000;
        let salt = '';
        let key = '';
        if (parts.length === 3) {
            iterations = parseInt(parts[0], 10);
            salt = parts[1];
            key = parts[2];
        }
        else if (parts.length === 2) {
            salt = parts[0];
            key = parts[1];
            // Try 100k first, fallback to 10k for legacy compatibility
            const hash100k = crypto_1.default.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
            if (crypto_1.default.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash100k, 'hex'))) {
                return true;
            }
            iterations = 10000;
        }
        else {
            return false;
        }
        if (!salt || !key)
            return false;
        const hash = crypto_1.default.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
    }
    generateAccessToken(user) {
        const permissions = roles_1.ROLE_PERMISSIONS_MAP[user.role] || [];
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
            departmentId: user.departmentId,
            clientId: user.clientId,
            permissions,
            iss: env_1.config.jwtIssuer,
            aud: env_1.config.jwtAudience,
        };
        return jsonwebtoken_1.default.sign(payload, env_1.config.jwtSecret, {
            expiresIn: env_1.config.accessTokenExpiresIn,
            jwtid: crypto_1.default.randomUUID(),
        });
    }
    async login(email, password, meta) {
        const user = await this.authRepo.findUserByEmail(email);
        if (!user) {
            throw new AppError_1.UnauthorizedError('Invalid email or password');
        }
        if (user.status !== 'ACTIVE') {
            throw new AppError_1.UnauthorizedError(`Account is ${user.status.toLowerCase()}`);
        }
        const isMatch = AuthService.verifyPassword(password, user.passwordHash);
        if (!isMatch) {
            throw new AppError_1.UnauthorizedError('Invalid email or password');
        }
        const accessToken = this.generateAccessToken(user);
        const refreshToken = crypto_1.default.randomBytes(40).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(accessToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + env_1.config.refreshTokenExpiresInDays);
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
        const permissions = roles_1.ROLE_PERMISSIONS_MAP[user.role] || [];
        return {
            user: userProfile,
            accessToken,
            refreshToken,
            permissions,
        };
    }
    async refresh(refreshToken) {
        const session = await this.authRepo.findSessionByRefreshToken(refreshToken);
        if (!session || session.isRevoked || session.expiresAt < new Date()) {
            throw new AppError_1.UnauthorizedError('Invalid or expired refresh token');
        }
        const user = await this.authRepo.findUserById(session.userId);
        if (!user || user.status !== 'ACTIVE') {
            throw new AppError_1.UnauthorizedError('Associated user account is no longer active');
        }
        // Revoke old session (Rotation)
        await this.authRepo.revokeSession(refreshToken);
        // Issue new pair
        const newAccessToken = this.generateAccessToken(user);
        const newRefreshToken = crypto_1.default.randomBytes(40).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(newAccessToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + env_1.config.refreshTokenExpiresInDays);
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
    async logout(refreshToken) {
        await this.authRepo.revokeSession(refreshToken);
    }
    async register(data, actor) {
        // Role Escalation Prevention: HR Admin cannot grant super_admin or managing_director
        if (actor && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            if (data.role === roles_1.UserRole.SUPER_ADMIN) {
                throw new AppError_1.UnauthorizedError('Forbidden: Only Super Administrator can provision super_admin accounts');
            }
            if (data.role === roles_1.UserRole.MANAGING_DIRECTOR) {
                throw new AppError_1.UnauthorizedError('Forbidden: Only Super Administrator can provision managing_director accounts');
            }
        }
        const existing = await this.authRepo.findUserByEmail(data.email);
        if (existing) {
            throw new AppError_1.ConflictError('A user with this email address already exists');
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
exports.AuthService = AuthService;
