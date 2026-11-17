"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAuthRepository = void 0;
class InMemoryAuthRepository {
    users = new Map();
    sessions = new Map();
    async findUserByEmail(email) {
        const normalized = email.toLowerCase().trim();
        for (const u of this.users.values()) {
            if (u.email.toLowerCase() === normalized)
                return u;
        }
        return null;
    }
    async findUserById(id) {
        return this.users.get(id) || null;
    }
    async findUserByEmployeeId(employeeId) {
        for (const u of this.users.values()) {
            if (u.employeeId === employeeId)
                return u;
        }
        return null;
    }
    async findUserByActivationTokenHash(tokenHash) {
        for (const u of this.users.values()) {
            if (u.activationTokenHash === tokenHash)
                return u;
        }
        return null;
    }
    async updateUserActivation(userId, data) {
        const user = this.users.get(userId);
        if (!user)
            throw new Error('User not found');
        user.passwordHash = data.passwordHash;
        user.status = data.status;
        user.invitationStatus = data.invitationStatus;
        user.activationTokenHash = null;
        user.activationTokenExpiresAt = null;
        user.updatedAt = new Date();
        return user;
    }
    async updateInvitationToken(userId, data) {
        const user = this.users.get(userId);
        if (!user)
            throw new Error('User not found');
        user.activationTokenHash = data.activationTokenHash;
        user.activationTokenExpiresAt = data.activationTokenExpiresAt;
        user.invitationStatus = data.invitationStatus;
        user.updatedAt = new Date();
        return user;
    }
    async getUserPermissions(userId, roleCode) {
        const { ROLE_PERMISSIONS_MAP } = require('../../../../shared/src/constants/roles');
        return ROLE_PERMISSIONS_MAP[roleCode] || [];
    }
    async recordLoginSuccess(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.failedLoginAttempts = 0;
            user.lockedUntil = null;
        }
    }
    async recordLoginFailure(userId, currentFailedAttempts, lockUntil) {
        const user = this.users.get(userId);
        if (user) {
            user.failedLoginAttempts = currentFailedAttempts + 1;
            user.lockedUntil = lockUntil || null;
        }
    }
    async createUser(userData) {
        const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date();
        const user = {
            ...userData,
            id,
            email: userData.email.toLowerCase().trim(),
            createdAt: now,
            updatedAt: now,
        };
        this.users.set(id, user);
        return user;
    }
    async createSession(sessionData) {
        const id = `ses-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date();
        const session = {
            ...sessionData,
            id,
            isRevoked: false,
            createdAt: now,
            updatedAt: now,
        };
        this.sessions.set(session.refreshToken, session);
        return session;
    }
    async findSessionByRefreshToken(refreshToken) {
        return this.sessions.get(refreshToken) || null;
    }
    async revokeSession(refreshToken) {
        const session = this.sessions.get(refreshToken);
        if (session) {
            session.isRevoked = true;
            session.updatedAt = new Date();
        }
    }
    async revokeAllUserSessions(userId) {
        for (const s of this.sessions.values()) {
            if (s.userId === userId) {
                s.isRevoked = true;
                s.updatedAt = new Date();
            }
        }
    }
}
exports.InMemoryAuthRepository = InMemoryAuthRepository;
