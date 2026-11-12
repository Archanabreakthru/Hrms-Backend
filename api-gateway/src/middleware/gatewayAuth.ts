import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { gatewayConfig } from '../config/env';
import { JwtTokenPayload } from '../../../shared/src/contracts/auth';

/**
 * Validates JWT at the edge, strips untrusted forwarded headers,
 * and sets sanitized identity claims for downstream microservices.
 */
export function gatewayAuth(optional = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Strip any spoofed headers from incoming client request
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];
    delete req.headers['x-employee-id'];
    delete req.headers['x-tenant-id'];
    delete req.headers['x-client-id'];

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (optional) return next();
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
      });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, gatewayConfig.jwtSecret) as JwtTokenPayload;
      
      // Inject verified downstream headers (supports sub and userId)
      const sanitizedUserId = (decoded as any).userId || decoded.sub;
      req.headers['x-user-id'] = sanitizedUserId;
      req.headers['x-user-role'] = decoded.role;
      if (decoded.employeeId) req.headers['x-employee-id'] = decoded.employeeId;
      if ((decoded as any).tenantId) req.headers['x-tenant-id'] = (decoded as any).tenantId;
      if (decoded.clientId) req.headers['x-client-id'] = decoded.clientId;

      (req as any).user = decoded;
      next();
    } catch {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid' },
      });
    }
  };
}

