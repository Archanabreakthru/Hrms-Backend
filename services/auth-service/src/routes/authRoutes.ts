import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import {
  loginSchema,
  refreshTokenSchema,
  registerUserSchema,
  provisionUserSchema,
  activateAccountSchema,
  resendInviteSchema,
} from '../validators/authValidators';
import { verifyServiceAuth } from '../middleware/serviceAuth';
import { config } from '../config/env';

export function createAuthRouter(authController: AuthController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  router.post('/login', validateRequest(loginSchema), authController.login);
  router.post('/refresh', validateRequest(refreshTokenSchema), authController.refresh);
  router.post('/logout', authController.logout);

  // Internal Service-to-Service Account Provisioning (Protected by HMAC Service Signature)
  router.post(
    '/provision',
    verifyServiceAuth('employee-service'),
    validateRequest(provisionUserSchema),
    authController.provision
  );

  // Public Employee Account Activation
  router.post(
    '/activate',
    validateRequest(activateAccountSchema),
    authController.activate
  );

  // HR Resend Account Invitation (Protected by auth.users.manage permission)
  router.post(
    '/resend-invite',
    authMiddleware,
    requirePermission('auth.users.manage'),
    validateRequest(resendInviteSchema),
    authController.resendInvite
  );

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

  // User & Role Management endpoints for Super Admin / authorized operators
  router.get(
    '/users',
    authMiddleware,
    requirePermission('auth.users.manage', 'org.profile.manage'),
    authController.listUsers
  );
  router.put(
    '/users/:id/role',
    authMiddleware,
    requirePermission('auth.users.manage'),
    authController.updateRole
  );

  return router;
}

