import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expenseService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  // ==========================================
  // Categories
  // ==========================================

  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const categories = await this.expenseService.listCategories(activeOnly);
      apiSuccess(res, categories, 200);
    } catch (err) {
      next(err);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = await this.expenseService.getCategoryById(req.params.id);
      apiSuccess(res, category, 200);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // Claims
  // ==========================================

  listClaims = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = {
        status: req.query.status as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        fromDate: req.query.fromDate as string | undefined,
        toDate: req.query.toDate as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };
      const claims = await this.expenseService.listClaims(filter, req.user!);
      apiSuccess(res, claims, 200);
    } catch (err) {
      next(err);
    }
  };

  getClaimById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await this.expenseService.getClaimById(req.params.id, req.user!);
      apiSuccess(res, claim, 200);
    } catch (err) {
      next(err);
    }
  };

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

  reimburseClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reimbursementReference, remarks } = req.body;
      const claim = await this.expenseService.reimburseClaim(
        req.params.id,
        reimbursementReference,
        remarks,
        req.user!
      );
      apiSuccess(res, claim, 200);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // Advances / Petty Cash
  // ==========================================

  listAdvances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = {
        status: req.query.status as string | undefined,
        advanceType: req.query.advanceType as string | undefined,
        fromDate: req.query.fromDate as string | undefined,
        toDate: req.query.toDate as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };
      const advances = await this.expenseService.listAdvances(filter, req.user!);
      apiSuccess(res, advances, 200);
    } catch (err) {
      next(err);
    }
  };

  getAdvanceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adv = await this.expenseService.getAdvanceById(req.params.id, req.user!);
      apiSuccess(res, adv, 200);
    } catch (err) {
      next(err);
    }
  };

  requestAdvance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adv = await this.expenseService.requestAdvance(req.body, req.user!);
      apiSuccess(res, adv, 201);
    } catch (err) {
      next(err);
    }
  };

  reviewAdvance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, approvedAmount, remarks } = req.body;
      const adv = await this.expenseService.reviewAdvance(
        req.params.id,
        decision,
        approvedAmount,
        remarks,
        req.user!
      );
      apiSuccess(res, adv, 200);
    } catch (err) {
      next(err);
    }
  };

  disburseAdvance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentReference } = req.body;
      const adv = await this.expenseService.disburseAdvance(
        req.params.id,
        paymentReference,
        req.user!
      );
      apiSuccess(res, adv, 200);
    } catch (err) {
      next(err);
    }
  };

  settleAdvance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { actualExpense, settlementNote } = req.body;
      const adv = await this.expenseService.settleAdvance(
        req.params.id,
        actualExpense,
        settlementNote,
        req.user!
      );
      apiSuccess(res, adv, 200);
    } catch (err) {
      next(err);
    }
  };
}
