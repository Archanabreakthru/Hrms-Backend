"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
function createRateLimiter(options) {
    const store = new Map();
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
        const now = Date.now();
        const clientRecord = store.get(ip);
        if (!clientRecord || now > clientRecord.resetAt) {
            store.set(ip, {
                count: 1,
                resetAt: now + options.windowMs,
            });
            return next();
        }
        if (clientRecord.count >= options.max) {
            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests. Please try again later.',
                },
            });
        }
        clientRecord.count++;
        next();
    };
}
