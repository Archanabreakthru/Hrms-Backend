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
    let clientRecord = store.get(ip);

    if (!clientRecord || now > clientRecord.resetAt) {
      clientRecord = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      store.set(ip, clientRecord);
      res.setHeader('X-RateLimit-Limit', options.max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - 1).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetAt / 1000).toString());
      return next();
    }

    res.setHeader('X-RateLimit-Limit', options.max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - clientRecord.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetAt / 1000).toString());

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

