import {
  IAttendanceRepository,
  AttendanceRecordDTO,
  ShiftDTO,
  LeaveApplicationDTO,
  RegularizationDTO,
} from '../repositories/attendanceRepository';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../../../shared/src/errors/AppError';
import { AuthenticatedUser } from '../../../../shared/src/contracts/auth';
import { UserRole } from '../../../../shared/src/constants/roles';
import { EventPublisher, createEvent } from '../../../../shared/src/infrastructure/messaging';

export class AttendanceService {
  constructor(
    private attendanceRepo: IAttendanceRepository,
    private eventBus?: EventPublisher
  ) {}

  /**
   * Records Clock-In or Clock-Out
   */
  async punchClock(
    params: {
      employeeId: string;
      date: string; // YYYY-MM-DD
      punchType: 'IN' | 'OUT';
      timestamp: string; // ISO
      workMode?: 'Office' | 'Client_Site' | 'Remote';
      shiftId?: string;
      latitude?: number;
      longitude?: number;
      photoUrl?: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ): Promise<AttendanceRecordDTO> {
    const isSelf = actor.employeeId === params.employeeId;
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isSelf && !isHr) {
      throw new ForbiddenError('You can only record attendance punches for yourself');
    }

    const shift = await this.attendanceRepo.findShift(params.shiftId || 'SHIFT-GEN');
    if (!shift) throw new NotFoundError(`Shift ${params.shiftId} not found`);

    let record = await this.attendanceRepo.findRecord(params.employeeId, params.date);
    const now = new Date();

    if (params.punchType === 'IN') {
      if (record && record.checkInTime) {
        throw new ConflictError(`Employee ${params.employeeId} has already clocked in for ${params.date}`);
      }

      // Late arrival detection (compare HH:mm)
      const punchDate = new Date(params.timestamp);
      const punchMinutes = punchDate.getUTCHours() * 60 + punchDate.getUTCMinutes();
      const [shiftHour, shiftMinute] = shift.startTime.split(':').map((n) => parseInt(n, 10));
      const shiftStartMinutes = shiftHour * 60 + shiftMinute + shift.gracePeriodMins;

      const isLate = punchMinutes > shiftStartMinutes;

      const newRecord: AttendanceRecordDTO = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        employeeId: params.employeeId,
        date: params.date,
        shiftId: shift.id,
        workMode: params.workMode || 'Office',
        checkInTime: params.timestamp,
        breakDurationMinutes: 60,
        totalWorkingHours: 0,
        overtimeHours: 0,
        status: isLate ? 'Late' : 'Present',
        isLate,
        isEarlyDeparture: false,
        checkInPhotoUrl: params.photoUrl,
        checkInLatitude: params.latitude,
        checkInLongitude: params.longitude,
        notes: params.notes,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await this.attendanceRepo.saveRecord(newRecord);

      // Publish event for Client Service and Notification Service
      if (this.eventBus) {
        await this.eventBus.publish(
          'attendance.punched',
          createEvent('ATTENDANCE_PUNCH_RECORDED', saved.id, 'Attendance', {
            attendanceId: saved.id,
            employeeId: saved.employeeId,
            date: saved.date,
            punchType: 'IN',
            workMode: saved.workMode,
            timestamp: saved.checkInTime,
          })
        );
      }

      return saved;
    } else {
      // Clock-Out
      if (!record || !record.checkInTime) {
        throw new ValidationError(`Cannot clock out without an existing clock-in record on ${params.date}`);
      }

      const checkInDate = new Date(record.checkInTime);
      const checkOutDate = new Date(params.timestamp);

      if (checkOutDate.getTime() <= checkInDate.getTime()) {
        throw new ValidationError('Clock-out time must be after clock-in time');
      }

      const diffMillis = checkOutDate.getTime() - checkInDate.getTime();
      const grossHours = diffMillis / (1000 * 60 * 60);
      const netHours = Math.max(0, grossHours - record.breakDurationMinutes / 60);
      const roundedHours = Math.round(netHours * 100) / 100;

      // Status calculation
      let status: AttendanceRecordDTO['status'] = 'Present';
      if (roundedHours < shift.halfDayThreshold) {
        status = 'Absent';
      } else if (roundedHours < shift.fullDayThreshold) {
        status = 'Half_Day';
      }

      const overtimeHours = Math.max(0, Math.round((roundedHours - shift.fullDayThreshold) * 100) / 100);

      // Early departure check (compare UTC minutes)
      const outMinutes = checkOutDate.getUTCHours() * 60 + checkOutDate.getUTCMinutes();
      const [endHour, endMinute] = shift.endTime.split(':').map((n) => parseInt(n, 10));
      const shiftEndMinutes = endHour * 60 + endMinute;
      const isEarlyDeparture = outMinutes < shiftEndMinutes;

      const updatedRecord: AttendanceRecordDTO = {
        ...record,
        checkOutTime: params.timestamp,
        totalWorkingHours: roundedHours,
        overtimeHours,
        status,
        isEarlyDeparture,
        checkOutPhotoUrl: params.photoUrl || record.checkOutPhotoUrl,
        checkOutLatitude: params.latitude || record.checkOutLatitude,
        checkOutLongitude: params.longitude || record.checkOutLongitude,
        updatedAt: now,
      };

      const saved = await this.attendanceRepo.saveRecord(updatedRecord);

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish(
          'attendance.punched',
          createEvent('ATTENDANCE_PUNCH_RECORDED', saved.id, 'Attendance', {
            attendanceId: saved.id,
            employeeId: saved.employeeId,
            date: saved.date,
            punchType: 'OUT',
            workMode: saved.workMode,
            workingHours: saved.totalWorkingHours,
            overtimeHours: saved.overtimeHours,
            status: saved.status,
          })
        );
      }

      return saved;
    }
  }

  /**
   * Submit Attendance Regularization Request
   */
  async requestRegularization(
    params: {
      attendanceRecordId: string;
      employeeId: string;
      requestedCheckIn: string;
      requestedCheckOut: string;
      reason: string;
    },
    actor: AuthenticatedUser
  ): Promise<RegularizationDTO> {
    if (actor.employeeId !== params.employeeId && actor.role !== UserRole.HR_ADMIN) {
      throw new ForbiddenError('You can only submit regularization requests for your own attendance');
    }

    const record = await this.attendanceRepo.findRecordById(params.attendanceRecordId);
    if (!record) throw new NotFoundError(`Attendance record ${params.attendanceRecordId} not found`);

    const reg: RegularizationDTO = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attendanceRecordId: params.attendanceRecordId,
      employeeId: params.employeeId,
      requestedCheckIn: params.requestedCheckIn,
      requestedCheckOut: params.requestedCheckOut,
      reason: params.reason,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.attendanceRepo.saveRegularization(reg);
  }

  /**
   * Review Regularization Request (Manager or HR)
   */
  async reviewRegularization(
    id: string,
    decision: 'Approved' | 'Rejected',
    remarks: string | undefined,
    actor: AuthenticatedUser
  ): Promise<RegularizationDTO> {
    const isManagerOrHr =
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.REPORTING_MANAGER ||
      actor.role === UserRole.SENIOR_MANAGER;

    if (!isManagerOrHr) {
      throw new ForbiddenError('Only managers or HR administrators can review regularization requests');
    }

    const reg = await this.attendanceRepo.findRegularization(id);
    if (!reg) throw new NotFoundError(`Regularization request ${id} not found`);

    reg.status = decision;
    reg.reviewedBy = actor.id;
    reg.reviewedAt = new Date();
    reg.reviewRemarks = remarks;
    reg.updatedAt = new Date();

    const saved = await this.attendanceRepo.saveRegularization(reg);

    // If approved, update underlying attendance record
    if (decision === 'Approved') {
      const record = await this.attendanceRepo.findRecordById(reg.attendanceRecordId);
      if (record) {
        record.checkInTime = reg.requestedCheckIn;
        record.checkOutTime = reg.requestedCheckOut;
        record.status = 'Present';
        record.isLate = false;
        record.isEarlyDeparture = false;
        await this.attendanceRepo.saveRecord(record);
      }
    }

    return saved;
  }

  /**
   * Apply for Leave with Balance Ledger Check
   */
  async applyLeave(
    params: {
      employeeId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      isHalfDay: boolean;
      halfDaySession?: string;
      reason: string;
    },
    actor: AuthenticatedUser
  ): Promise<LeaveApplicationDTO> {
    if (actor.employeeId !== params.employeeId && actor.role !== UserRole.HR_ADMIN) {
      throw new ForbiddenError('You can only apply for your own leaves');
    }

    // 1. Calculate working days
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    if (end.getTime() < start.getTime()) {
      throw new ValidationError('End date cannot be prior to start date');
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const requestedDays = params.isHalfDay ? 0.5 : diffDays;

    // 2. Check balance ledger
    const year = start.getFullYear();
    const balance = await this.attendanceRepo.findLeaveBalance(params.employeeId, params.leaveTypeId, year);
    if (!balance) throw new NotFoundError('Leave balance ledger not found');

    if (balance.availableDays < requestedDays && params.leaveTypeId !== 'LOP') {
      throw new ValidationError(
        `Insufficient leave balance. Requested ${requestedDays} days, available ${balance.availableDays} days`
      );
    }

    // 3. Deduct pending days
    balance.pendingDays += requestedDays;
    await this.attendanceRepo.saveLeaveBalance(balance);

    const app: LeaveApplicationDTO = {
      id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: params.employeeId,
      leaveTypeId: params.leaveTypeId,
      startDate: params.startDate,
      endDate: params.endDate,
      isHalfDay: params.isHalfDay,
      halfDaySession: params.halfDaySession,
      totalDays: requestedDays,
      reason: params.reason,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.attendanceRepo.saveLeaveApplication(app);
  }

  /**
   * Review Leave Application (Manager or HR)
   */
  async reviewLeave(
    applicationId: string,
    decision: 'Approved' | 'Rejected',
    rejectionReason: string | undefined,
    actor: AuthenticatedUser
  ): Promise<LeaveApplicationDTO> {
    const isManagerOrHr =
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.REPORTING_MANAGER ||
      actor.role === UserRole.SENIOR_MANAGER;

    if (!isManagerOrHr) {
      throw new ForbiddenError('Only managers or HR administrators can approve or reject leaves');
    }

    const app = await this.attendanceRepo.findLeaveApplication(applicationId);
    if (!app) throw new NotFoundError(`Leave application ${applicationId} not found`);

    if (app.status !== 'Pending') {
      throw new ValidationError(`Leave application has already been ${app.status.toLowerCase()}`);
    }

    const year = new Date(app.startDate).getFullYear();
    const balance = await this.attendanceRepo.findLeaveBalance(app.employeeId, app.leaveTypeId, year);

    if (decision === 'Approved') {
      app.status = 'Approved';
      app.approvedBy = actor.id;
      app.approvedAt = new Date();

      if (balance) {
        balance.pendingDays = Math.max(0, balance.pendingDays - app.totalDays);
        balance.usedDays += app.totalDays;
        await this.attendanceRepo.saveLeaveBalance(balance);
      }

      // Publish event for Payroll and Organization calendars
      if (this.eventBus) {
        await this.eventBus.publish(
          'leave.approved',
          createEvent('LEAVE_APPROVED', app.id, 'Leave', {
            leaveApplicationId: app.id,
            employeeId: app.employeeId,
            startDate: app.startDate,
            endDate: app.endDate,
            totalDays: app.totalDays,
            leaveTypeId: app.leaveTypeId,
          })
        );
      }
    } else {
      app.status = 'Rejected';
      app.rejectionReason = rejectionReason;

      if (balance) {
        balance.pendingDays = Math.max(0, balance.pendingDays - app.totalDays);
        await this.attendanceRepo.saveLeaveBalance(balance);
      }
    }

    app.updatedAt = new Date();
    return this.attendanceRepo.saveLeaveApplication(app);
  }

  /**
   * Query Attendance Summary for Payroll Service
   */
  async getMonthlySummaryForPayroll(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    presentDays: number;
    halfDays: number;
    absentDays: number;
    totalOvertimeHours: number;
    lossOfPayDays: number;
  }> {
    const records = await this.attendanceRepo.listRecords({ employeeId, startDate, endDate });
    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalOvertimeHours = 0;

    for (const r of records) {
      if (r.status === 'Present' || r.status === 'Late') presentDays++;
      else if (r.status === 'Half_Day') halfDays++;
      else if (r.status === 'Absent') absentDays++;
      totalOvertimeHours += r.overtimeHours || 0;
    }

    // Loss of Pay = Unexcused Absences + (HalfDays * 0.5)
    const lossOfPayDays = absentDays + halfDays * 0.5;

    return {
      presentDays,
      halfDays,
      absentDays,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      lossOfPayDays,
    };
  }
}
