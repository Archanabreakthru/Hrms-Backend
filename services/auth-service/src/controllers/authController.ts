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
      apiSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  };
}

