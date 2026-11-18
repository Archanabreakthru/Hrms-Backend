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
      const { decision, remarks, stage } = req.body;
      const reg = await this.attendanceService.reviewRegularization(req.params.id, decision, remarks, stage, req.user!);
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

  listRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, startDate, endDate } = req.query as {
        employeeId?: string;
        startDate?: string;
        endDate?: string;
      };
      const records = await this.attendanceService.listAttendanceRecords(
        { employeeId, startDate, endDate },
        req.user!
      );
      apiSuccess(res, records, 200);
    } catch (err) {
      next(err);
    }
  };

  getToday = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetEmployeeId = (req.query.employeeId as string) || req.user!.employeeId;
      if (!targetEmployeeId) {
        apiSuccess(res, null, 200);
        return;
      }
      const record = await this.attendanceService.getTodayAttendanceRecord(targetEmployeeId, req.user!);
      apiSuccess(res, record, 200);
    } catch (err) {
      next(err);
    }
  };

  listShifts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shifts = await this.attendanceService.listShifts();
      apiSuccess(res, shifts, 200);
    } catch (err) {
      next(err);
    }
  };

  createShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shift = await this.attendanceService.createShift(req.body, req.user!);
      apiSuccess(res, shift, 201);
    } catch (err) {
      next(err);
    }
  };

  listRegularizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, status } = req.query as { employeeId?: string; status?: string };
      const regs = await this.attendanceService.listRegularizations({ employeeId, status }, req.user!);
      apiSuccess(res, regs, 200);
    } catch (err) {
      next(err);
    }
  };

  createManualEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.attendanceService.createManualAttendance(req.body, req.user!);
      apiSuccess(res, record, 201);
    } catch (err) {
      next(err);
    }
  };

  listLeaves = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, status } = req.query as { employeeId?: string; status?: string };
      const leaves = await this.attendanceService.listLeaveApplications({ employeeId, status }, req.user!);
      apiSuccess(res, leaves, 200);
    } catch (err) {
      next(err);
    }
  };

  cancelLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reason } = req.body;
      const app = await this.attendanceService.cancelLeave(req.params.id, reason, req.user!);
      apiSuccess(res, app, 200);
    } catch (err) {
      next(err);
    }
  };

  listBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeId = (req.query.employeeId as string) || req.user!.employeeId;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const balances = await this.attendanceService.listLeaveBalances(employeeId, year, req.user!);
      apiSuccess(res, balances, 200);
    } catch (err) {
      next(err);
    }
  };

  listLeaveTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const types = await this.attendanceService.listLeaveTypes();
      apiSuccess(res, types, 200);
    } catch (err) {
      next(err);
    }
  };

  createLeaveType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const type = await this.attendanceService.createLeaveType(req.body, req.user!);
      apiSuccess(res, type, 201);
    } catch (err) {
      next(err);
    }
  };

  updateLeaveType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const type = await this.attendanceService.updateLeaveType(req.params.id, req.body, req.user!);
      apiSuccess(res, type, 200);
    } catch (err) {
      next(err);
    }
  };

  listHolidays = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const branchId = req.query.branchId as string | undefined;
      const holidays = await this.attendanceService.listHolidays(year, branchId);
      apiSuccess(res, holidays, 200);
    } catch (err) {
      next(err);
    }
  };

  createHoliday = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const holiday = await this.attendanceService.createHoliday(req.body, req.user!);
      apiSuccess(res, holiday, 201);
    } catch (err) {
      next(err);
    }
  };

  deleteHoliday = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.attendanceService.deleteHoliday(req.params.id, req.user!);
      apiSuccess(res, { message: 'Holiday deleted successfully' }, 200);
    } catch (err) {
      next(err);
    }
  };

  createShiftSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schedule = await this.attendanceService.createShiftSchedule(req.body, req.user!);
      apiSuccess(res, schedule, 201);
    } catch (err) {
      next(err);
    }
  };

  listShiftSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, shiftId, isActive } = req.query as { employeeId?: string; shiftId?: string; isActive?: string };
      const schedules = await this.attendanceService.listShiftSchedules(
        {
          employeeId,
          shiftId,
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
        },
        req.user!
      );
      apiSuccess(res, schedules, 200);
    } catch (err) {
      next(err);
    }
  };
}

