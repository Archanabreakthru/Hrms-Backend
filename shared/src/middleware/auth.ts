import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { AuthenticatedUser, JwtTokenPayload } from '../contracts/auth';
import { Permission, AccessScope } from '../constants/roles';

// Extend express request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function createAuthMiddleware(jwtSecret: string, issuer = 'orbyx-auth-service', audience = 'orbyx-hrms-client') {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Missing or malformed Authorization header'));
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, jwtSecret, {
        issuer,
        audience,
      }) as JwtTokenPayload;

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        employeeId: decoded.employeeId,
        departmentId: decoded.departmentId,
        clientId: decoded.clientId,
        permissions: decoded.permissions || [],
      };

      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token has expired'));
      }
      return next(new UnauthorizedError('Invalid token signature or payload'));
    }
  };
}

export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userPerms = new Set(req.user.permissions);
    const hasPermission = requiredPermissions.some((perm) => userPerms.has(perm));

    if (!hasPermission) {
      return next(
        new ForbiddenError(`Insufficient permissions. Required one of: ${requiredPermissions.join(', ')}`)
      );
    }

    next();
  };
}

export function requireScope(
  evaluator: (user: AuthenticatedUser, req: Request) => { allowed: boolean; reason?: string }
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const result = evaluator(req.user, req);
    if (!result.allowed) {
      return next(new ForbiddenError(result.reason || 'Data access scope restriction violation'));
    }

    next();
  };
}

