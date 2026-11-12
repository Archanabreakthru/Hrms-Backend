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
