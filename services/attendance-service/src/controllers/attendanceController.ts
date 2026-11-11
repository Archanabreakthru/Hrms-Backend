import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  punch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.attendanceService.punchClock(req.body, req.user!);
      apiSuccess(res, record, 200);
    } catch (err) {
      next(err);
    }
  };

  requestRegularization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reg = await this.attendanceService.requestRegularization(req.body, req.user!);
      apiSuccess(res, reg, 201);
    } catch (err) {
      next(err);
    }
  };

  reviewRegularization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, remarks } = req.body;
      const reg = await this.attendanceService.reviewRegularization(req.params.id, decision, remarks, req.user!);
      apiSuccess(res, reg, 200);
    } catch (err) {
      next(err);
    }
  };

  applyLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leave = await this.attendanceService.applyLeave(req.body, req.user!);
      apiSuccess(res, leave, 201);
    } catch (err) {
      next(err);
    }
  };

  reviewLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, rejectionReason } = req.body;
      const leave = await this.attendanceService.reviewLeave(req.params.id, decision, rejectionReason, req.user!);
      apiSuccess(res, leave, 200);
    } catch (err) {
      next(err);
    }
  };

  getPayrollSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, startDate, endDate } = req.query as { employeeId: string; startDate: string; endDate: string };
      const summary = await this.attendanceService.getMonthlySummaryForPayroll(employeeId, startDate, endDate);
      apiSuccess(res, summary, 200);
    } catch (err) {
      next(err);
    }
  };
}

