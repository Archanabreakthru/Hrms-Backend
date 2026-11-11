import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import { loginSchema, refreshTokenSchema, registerUserSchema } from '../validators/authValidators';
import { config } from '../config/env';

export function createAuthRouter(authController: AuthController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  router.post('/login', validateRequest(loginSchema), authController.login);
  router.post('/refresh', validateRequest(refreshTokenSchema), authController.refresh);
  router.post('/logout', authController.logout);

  // Administrative user creation (Requires auth.users.manage permission)
  router.post(
    '/register',
    authMiddleware,
    requirePermission('auth.users.manage'),
    validateRequest(registerUserSchema),
    authController.register
  );

  // Current session info
  router.get('/me', authMiddleware, authController.me);

  return router;
}

