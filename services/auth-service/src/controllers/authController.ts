import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class AuthController {
  constructor(private authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await this.authService.login(email, password, { userAgent, ipAddress });
      apiSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refresh(refreshToken);
      apiSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      apiSuccess(res, { message: 'Logged out successfully' }, 200);
    } catch (err) {
      next(err);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body, req.user);
      apiSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      apiSuccess(res, req.user, 200);
    } catch (err) {
      next(err);
    }
  };

  provision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.provision(req.body);
      // Notice: token is returned only to internal service caller (outbox dispatcher)
      apiSuccess(res, result, result.isNew ? 201 : 200);
    } catch (err) {
      next(err);
    }
  };

  activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;
      const result = await this.authService.activate(token, password);
      apiSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  };

  resendInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId } = req.body;
      const actor = req.user as any;
      const result = await this.authService.resendInvitation(employeeId, actor);

      // Dispatch activation email via Notification Service
      if (result.activationToken) {
        try {
          const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008';
          await fetch(`${notificationUrl}/api/v1/notifications/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientId: result.email,
              title: 'Welcome to Celestial - Your HRMS Account Is Ready',
              message: 'A fresh activation invitation has been generated for your account. Please activate within 24 hours.',
              channel: 'EMAIL',
              metadata: {
                recipientEmail: result.email,
                employeeId: result.employeeId,
                activationToken: result.activationToken,
              },
            }),
          });
        } catch (notifErr: any) {
          console.warn('[auth-service] Notification dispatch on resend-invite deferred:', notifErr.message);
        }
      }

      apiSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.authService.listUsers();
      apiSuccess(res, users, 200);
    } catch (err) {
      next(err);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const updated = await this.authService.updateUserRole(id, role);
      apiSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  };

  listRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.authService.listRoles();
      apiSuccess(res, roles, 200);
    } catch (err) {
      next(err);
    }
  };

  createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.authService.createRole(req.body);
      apiSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  };

  updateRoleDefinition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.params;
      const updated = await this.authService.updateRole(code, req.body);
      apiSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  };

  deleteRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.params;
      const result = await this.authService.deleteRole(code);
      apiSuccess(res, { deleted: result }, 200);
    } catch (err) {
      next(err);
    }
  };

  listPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = await this.authService.listAllPermissions();
      apiSuccess(res, permissions, 200);
    } catch (err) {
      next(err);
    }
  };
}

