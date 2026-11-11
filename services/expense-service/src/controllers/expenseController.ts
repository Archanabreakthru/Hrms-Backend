import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expenseService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  submitClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await this.expenseService.submitClaim(req.body, req.user!);
      apiSuccess(res, claim, 201);
    } catch (err) {
      next(err);
    }
  };

  managerReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, remarks } = req.body;
      const claim = await this.expenseService.managerReview(req.params.id, decision, remarks, req.user!);
      apiSuccess(res, claim, 200);
    } catch (err) {
      next(err);
    }
  };

  hrFinalApprove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, remarks } = req.body;
      const claim = await this.expenseService.hrFinalApprove(req.params.id, decision, remarks, req.user!);
      apiSuccess(res, claim, 200);
    } catch (err) {
      next(err);
    }
  };
}

