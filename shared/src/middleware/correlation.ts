import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-correlation-id'];
  const correlationId = typeof incomingId === 'string' && incomingId.trim() ? incomingId : crypto.randomUUID();
  
  res.locals.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

