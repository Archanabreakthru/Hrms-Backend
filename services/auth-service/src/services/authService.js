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
    async generateAccessToken(user) {
        // Dynamically retrieve permissions from PostgreSQL tables
        const permissions = (await this.authRepo.getUserPermissions(user.id, user.role));
        const isBootstrap = user.role === 'super_admin' || user.username === 'bootstrap_admin' || user.email === 'arunarchana2034@gmail.com' || user.email === 'admin@orbyx.internal';
        const username = user.username || (isBootstrap ? 'bootstrap_admin' : undefined);
        const name = isBootstrap ? 'Bootstrap Administrator' : (user.username || user.email.split('@')[0]);
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            username,
            name,
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
        // 1. Account Lockout Check
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
            throw new AppError_1.UnauthorizedError(`Account is temporarily locked due to multiple failed attempts. Please try again in ${waitMinutes} minute(s).`);
        }
        // 2. Account Status Validation
        if (user.status === 'PENDING_ACTIVATION') {
            throw new AppError_1.UnauthorizedError('Account pending activation. Please use the activation link sent to your registered email.');
        }
        if (user.status === 'SUSPENDED') {
            throw new AppError_1.UnauthorizedError('Account has been suspended. Please contact HR administration.');
        }
        if (user.status === 'DISABLED' || user.status === 'DEACTIVATED') {
            throw new AppError_1.UnauthorizedError('Account is disabled. Please contact your system administrator.');
        }
        if (user.status === 'TERMINATED') {
            throw new AppError_1.UnauthorizedError('Account access has been revoked due to employee separation.');
        }
        if (user.status !== 'ACTIVE' || user.isActive === false) {
            throw new AppError_1.UnauthorizedError(`Account status is ${user.status.toLowerCase()}. Access denied.`);
        }
        // 3. Password Verification
        const isMatch = AuthService.verifyPassword(password, user.passwordHash);
        if (!isMatch) {
            const currentAttempts = user.failedLoginAttempts || 0;
            let lockUntil = null;
            if (currentAttempts + 1 >= 5) {
                lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
            }
            await this.authRepo.recordLoginFailure(user.id, currentAttempts, lockUntil);
            throw new AppError_1.UnauthorizedError('Invalid email or password');
        }
        // 4. Successful Login: Reset lockout and generate tokens
        await this.authRepo.recordLoginSuccess(user.id);
        const permissions = (await this.authRepo.getUserPermissions(user.id, user.role));
        const accessToken = await this.generateAccessToken(user);
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
        const isBootstrap = user.email === 'arunarchana2034@gmail.com' || user.username === 'bootstrap_admin';
        if (isBootstrap) {
            userProfile.username = 'bootstrap_admin';
            userProfile.name = 'Bootstrap Administrator';
        }
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
        if (!user) {
            throw new AppError_1.UnauthorizedError('Associated user account no longer exists');
        }
        // Strict account status checks during token refresh
        if (user.status !== 'ACTIVE' || user.isActive === false) {
            // Immediately revoke all sessions for this suspended/terminated user
            await this.authRepo.revokeAllUserSessions(user.id);
            throw new AppError_1.UnauthorizedError(`Account is ${user.status.toLowerCase()}. Session terminated.`);
        }
        // Revoke old session (Rotation)
        await this.authRepo.revokeSession(refreshToken);
        // Issue new pair with dynamically refreshed permissions
        const newAccessToken = await this.generateAccessToken(user);
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
    /**
     * Idempotent internal account provisioning called by Employee Service outbox worker.
     * Generates secure activation token and sets account to PENDING_ACTIVATION.
     */
    async provision(data) {
        const normalizedEmail = data.email.toLowerCase().trim();
        // 1. Check for conflicting existing records
        const existingByEmail = await this.authRepo.findUserByEmail(normalizedEmail);
        const existingByEmpId = await this.authRepo.findUserByEmployeeId(data.employeeId);
        if (existingByEmail && existingByEmpId && existingByEmail.id !== existingByEmpId.id) {
            throw new AppError_1.ConflictError('Conflicting identities: Email belongs to one user, employeeId belongs to another');
        }
        if (existingByEmail && !existingByEmpId) {
            if (existingByEmail.employeeId && existingByEmail.employeeId !== data.employeeId) {
                throw new AppError_1.ConflictError(`Email ${normalizedEmail} is already associated with employee ${existingByEmail.employeeId}`);
            }
        }
        if (!existingByEmail && existingByEmpId) {
            if (existingByEmpId.email !== normalizedEmail) {
                throw new AppError_1.ConflictError(`Employee ${data.employeeId} is already associated with email ${existingByEmpId.email}`);
            }
        }
        // 2. Idempotent return if account is already provisioned
        const existing = existingByEmail || existingByEmpId;
        if (existing) {
            const { passwordHash, ...existingProfile } = existing;
            // Generate a fresh activation token if still pending activation
            if (existing.status === 'PENDING_ACTIVATION') {
                const rawToken = crypto_1.default.randomBytes(32).toString('hex');
                const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                await this.authRepo.updateInvitationToken(existing.id, {
                    activationTokenHash: tokenHash,
                    activationTokenExpiresAt: expiresAt,
                    invitationStatus: 'PENDING_INVITE',
                    invitationSentAt: new Date(),
                });
                return {
                    user: existingProfile,
                    activationToken: rawToken,
                    invitationExpiresAt: expiresAt,
                    isNew: false,
                };
            }
            // If already active, return without generating a token
            return {
                user: existingProfile,
                activationToken: '',
                invitationExpiresAt: new Date(),
                isNew: false,
            };
        }
        // 3. Fresh Account Provisioning
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Placeholder password hash that cannot authenticate until employee sets their password
        const unactivatedPasswordHash = `UNACTIVATED:${crypto_1.default.randomBytes(32).toString('hex')}`;
        const createdUser = await this.authRepo.createUser({
            email: normalizedEmail,
            passwordHash: unactivatedPasswordHash,
            role: data.roleCode || roles_1.UserRole.EMPLOYEE,
            status: 'PENDING_ACTIVATION',
            employeeId: data.employeeId,
            departmentId: data.departmentId || undefined,
            clientId: data.clientId || undefined,
            activationTokenHash: tokenHash,
            activationTokenExpiresAt: expiresAt,
            invitationStatus: 'PENDING_INVITE',
        });
        const { passwordHash: _, ...profile } = createdUser;
        return {
            user: profile,
            activationToken: rawToken,
            invitationExpiresAt: expiresAt,
            isNew: true,
        };
    }
    /**
     * Account Activation: Verifies SHA-256 token, establishes new password, and activates account.
     */
    async activate(token, newPassword) {
        const tokenHash = crypto_1.default.createHash('sha256').update(token.trim()).digest('hex');
        const user = await this.authRepo.findUserByActivationTokenHash(tokenHash);
        if (!user) {
            throw new AppError_1.UnauthorizedError('Invalid or expired activation link');
        }
        if (user.status === 'ACTIVE') {
            throw new AppError_1.ConflictError('Account has already been activated. Please sign in with your credentials.');
        }
        if (user.status !== 'PENDING_ACTIVATION') {
            throw new AppError_1.UnauthorizedError(`Account cannot be activated because it is currently ${user.status.toLowerCase()}`);
        }
        const rawUser = await this.authRepo.findUserById(user.id);
        const expiresAt = rawUser && rawUser.activationTokenExpiresAt ? new Date(rawUser.activationTokenExpiresAt) : null;
        if (expiresAt && expiresAt.getTime() < Date.now()) {
            throw new AppError_1.UnauthorizedError('Activation link has expired. Please contact HR to resend your invitation.');
        }
        // Hash password with PBKDF2 (100k rounds)
        const passwordHash = AuthService.hashPassword(newPassword);
        await this.authRepo.updateUserActivation(user.id, {
            passwordHash,
            status: 'ACTIVE',
            invitationStatus: 'ACTIVATED',
            activationTokenHash: null,
            activationTokenExpiresAt: null,
        });
        return {
            success: true,
            email: user.email,
        };
    }
    /**
     * Resends invitation for an unactivated employee. Restricted to authorized HR administrators.
     */
    async resendInvitation(employeeId, actor) {
        const user = await this.authRepo.findUserByEmployeeId(employeeId);
        if (!user) {
            throw new AppError_1.NotFoundError(`No authentication record found for employee ${employeeId}`);
        }
        // Tenant / Organization scope check
        if (actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            if (actor.clientId && user.clientId && actor.clientId !== user.clientId) {
                throw new AppError_1.ForbiddenError('Access denied: You cannot manage accounts outside your organization');
            }
        }
        if (user.status === 'ACTIVE') {
            throw new AppError_1.ConflictError('Employee account is already active. Password reset should be used instead.');
        }
        if (user.status !== 'PENDING_ACTIVATION') {
            throw new AppError_1.ForbiddenError(`Cannot resend invitation: Account is ${user.status.toLowerCase()}`);
        }
        // Invalidate previous token and generate fresh 24h token
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.authRepo.updateInvitationToken(user.id, {
            activationTokenHash: tokenHash,
            activationTokenExpiresAt: expiresAt,
            invitationStatus: 'SENT',
            invitationSentAt: new Date(),
        });
        return {
            employeeId: user.employeeId || employeeId,
            email: user.email,
            activationToken: rawToken,
            invitationExpiresAt: expiresAt,
            invitationStatus: 'SENT',
        };
    }
    async listUsers() {
        if (this.authRepo.findAllUsers) {
            const all = await this.authRepo.findAllUsers();
            return all.map(({ passwordHash, ...rest }) => rest);
        }
        return [];
    }
    async updateUserRole(userId, newRoleCode) {
        if (this.authRepo.updateUserRole) {
            const updated = await this.authRepo.updateUserRole(userId, newRoleCode);
            const { passwordHash, ...rest } = updated;
            return rest;
        }
        throw new Error('updateUserRole not supported on this repository');
    }
    async listRoles() {
        if (this.authRepo.listRoles) {
            return this.authRepo.listRoles();
        }
        return [];
    }
    async createRole(data) {
        if (this.authRepo.createRole) {
            return this.authRepo.createRole(data);
        }
        throw new Error('createRole not supported on this repository');
    }
    async updateRole(code, data) {
        if (this.authRepo.updateRole) {
            return this.authRepo.updateRole(code, data);
        }
        throw new Error('updateRole not supported on this repository');
    }
    async deleteRole(code) {
        if (this.authRepo.deleteRole) {
            return this.authRepo.deleteRole(code);
        }
        throw new Error('deleteRole not supported on this repository');
    }
    async listAllPermissions() {
        if (this.authRepo.listAllPermissions) {
            return this.authRepo.listAllPermissions();
        }
        return [];
    }
}
exports.AuthService = AuthService;
