import { Request, Response, NextFunction } from 'express';
import { ClientService } from '../services/clientService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class ClientController {
  constructor(private clientService: ClientService) {}

  supervisorVerify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, remarks } = req.body;
      const verif = await this.clientService.supervisorVerify(req.params.id, decision, remarks, req.user!);
      apiSuccess(res, verif, 200);
    } catch (err) {
      next(err);
    }
  };

  hrResolveAndApprove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, hrComments } = req.body;
      const verif = await this.clientService.hrResolveAndApprove(req.params.id, decision, hrComments, req.user!);
      apiSuccess(res, verif, 200);
    } catch (err) {
      next(err);
    }
  };

  getPayrollVerificationSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, periodKey } = req.query as { employeeId: string; periodKey: string };
      const summary = await this.clientService.getVerifiedHoursAndAllowancesForPayroll(employeeId, periodKey);
      apiSuccess(res, summary, 200);
    } catch (err) {
      next(err);
    }
  };
}

