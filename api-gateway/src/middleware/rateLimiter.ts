import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { windowMs: number; max: number }) {
  const store = new Map<string, RateLimitRecord>();

  return (req: Request, res: Response, next: NextFunction) => {
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

