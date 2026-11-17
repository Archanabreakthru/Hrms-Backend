import { randomUUID } from 'crypto';
import {
  IAttendanceRepository,
  AttendanceRecordDTO,
  ShiftDTO,
  HolidayDTO,
  LeaveTypeDTO,
  LeaveBalanceDTO,
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
        id: randomUUID(),
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
      attendanceRecordId?: string;
      employeeId: string;
      targetDate?: string;
      requestedCheckIn: string;
      requestedCheckOut: string;
      reason: string;
    },
    actor: AuthenticatedUser
  ): Promise<RegularizationDTO> {
    if (actor.employeeId !== params.employeeId && actor.role !== UserRole.HR_ADMIN) {
      throw new ForbiddenError('You can only submit regularization requests for your own attendance');
    }

    const reg: RegularizationDTO = {
      id: randomUUID(),
      attendanceRecordId: params.attendanceRecordId,
      employeeId: params.employeeId,
      targetDate: params.targetDate || params.requestedCheckIn.split('T')[0],
      requestedCheckIn: params.requestedCheckIn,
      requestedCheckOut: params.requestedCheckOut,
      reason: params.reason,
      status: 'Pending Manager Approval',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.attendanceRepo.saveRegularization(reg);
  }

  /**
   * Review Regularization Request (Two-Tier Workflow: Manager Review -> HR Final Approval)
   */
  async reviewRegularization(
    id: string,
    decision: 'Approved' | 'Rejected',
    remarks: string | undefined,
    stageOrActor?: 'manager' | 'hr' | AuthenticatedUser,
    maybeActor?: AuthenticatedUser
  ): Promise<RegularizationDTO> {
    const actor: AuthenticatedUser = (maybeActor || (typeof stageOrActor === 'object' ? stageOrActor : undefined)) as AuthenticatedUser;
    const stage: 'manager' | 'hr' | undefined = typeof stageOrActor === 'string' ? stageOrActor : undefined;

    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.SENIOR_MANAGER;
    const isManager = actor.role === UserRole.REPORTING_MANAGER || isHr;

    if (!isManager) {
      throw new ForbiddenError('Only managers or HR administrators can review regularization requests');
    }

    const reg = await this.attendanceRepo.findRegularization(id);
    if (!reg) throw new NotFoundError(`Regularization request ${id} not found`);

    const now = new Date();
    reg.reviewedBy = actor.employeeId || actor.id;
    reg.reviewedAt = now;
    reg.reviewRemarks = remarks || reg.reviewRemarks;
    reg.updatedAt = now;

    // Determine target stage
    const effectiveStage = stage || (reg.status === 'Pending HR Approval' || isHr ? 'hr' : 'manager');

    if (effectiveStage === 'manager') {
      if (decision === 'Approved') {
        reg.status = 'Pending HR Approval';
      } else {
        reg.status = 'Manager Rejected';
      }
    } else {
      // HR Stage
      if (!isHr) {
        throw new ForbiddenError('Only HR administrators can execute final regularization approval');
      }
      if (decision === 'Approved') {
        reg.status = 'HR Approved';

        // Update underlying attendance record or create one if missing
        const targetDateStr = reg.targetDate ? reg.targetDate.split('T')[0] : reg.requestedCheckIn.split('T')[0];
        let record = reg.attendanceRecordId ? await this.attendanceRepo.findRecordById(reg.attendanceRecordId) : null;
        if (!record) {
          record = await this.attendanceRepo.findRecord(reg.employeeId, targetDateStr);
        }

        if (record) {
          record.checkInTime = reg.requestedCheckIn;
          record.checkOutTime = reg.requestedCheckOut;
          record.status = 'Present';
          record.isLate = false;
          record.isEarlyDeparture = false;
          record.notes = (record.notes ? record.notes + '; ' : '') + `Regularized: ${reg.reason}`;
          await this.attendanceRepo.saveRecord(record);
        } else {
          // Create new record for the date
          const shifts = await this.attendanceRepo.listShifts();
          if (shifts.length === 0) {
            // Need at least one shift to satisfy foreign key fk_attendance_records_shift
            await this.attendanceRepo.saveShift({
              id: randomUUID(),
              code: 'GEN-01',
              name: 'General Day Shift',
              startTime: '09:30',
              endTime: '18:30',
              gracePeriodMins: 15,
              halfDayThreshold: 4.5,
              fullDayThreshold: 8.0,
              isOvernight: false,
              weeklyOffDays: [0, 6],
              status: 'Active',
              createdAt: now,
              updatedAt: now,
            });
          }
          const activeShifts = await this.attendanceRepo.listShifts();
          const shiftId = activeShifts[0].id;
          const inDate = new Date(reg.requestedCheckIn);
          const outDate = new Date(reg.requestedCheckOut);
          const diffHours = Math.max(0, (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60) - 1);
          await this.attendanceRepo.saveRecord({
            id: randomUUID(),
            employeeId: reg.employeeId,
            date: targetDateStr,
            shiftId,
            workMode: 'Office',
            checkInTime: reg.requestedCheckIn,
            checkOutTime: reg.requestedCheckOut,
            breakDurationMinutes: 60,
            totalWorkingHours: Math.round(diffHours * 100) / 100,
            overtimeHours: Math.max(0, Math.round((diffHours - 8) * 100) / 100),
            status: 'Present',
            isLate: false,
            isEarlyDeparture: false,
            notes: `Regularized: ${reg.reason}`,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else {
        reg.status = 'HR Rejected';
      }
    }

    return this.attendanceRepo.saveRegularization(reg);
  }

  /**
   * Shift Scheduling Management
   */
  async createShiftSchedule(
    data: {
      employeeId: string;
      shiftId: string;
      effectiveFrom: string;
      effectiveTo?: string;
    },
    actor: AuthenticatedUser
  ) {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) {
      throw new ForbiddenError('Only HR Administrators can schedule employee shifts');
    }

    const shift = await this.attendanceRepo.findShift(data.shiftId);
    if (!shift) throw new NotFoundError(`Shift ${data.shiftId} not found`);

    const now = new Date();
    const schedule = {
      id: randomUUID(),
      employeeId: data.employeeId,
      shiftId: data.shiftId,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo,
      assignedBy: actor.employeeId || actor.id || 'HR Admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return this.attendanceRepo.saveShiftSchedule(schedule);
  }

  async listShiftSchedules(
    filter: { employeeId?: string; shiftId?: string; isActive?: boolean },
    actor: AuthenticatedUser
  ) {
    return this.attendanceRepo.listShiftSchedules(filter);
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

  /**
   * List attendance records with date range, employee filter, and RBAC scoping
   */
  async listAttendanceRecords(
    filter: { employeeId?: string; startDate?: string; endDate?: string },
    actor: AuthenticatedUser
  ): Promise<AttendanceRecordDTO[]> {
    const isHrOrAdmin = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    let targetEmployeeId = filter.employeeId;

    if (!isHrOrAdmin) {
      if (actor.role === UserRole.REPORTING_MANAGER || actor.role === UserRole.SENIOR_MANAGER) {
        // Manager can view self or if an employeeId is provided, their reports
        if (!targetEmployeeId) {
          targetEmployeeId = actor.employeeId;
        }
      } else {
        // Normal employee can ONLY query their own records
        targetEmployeeId = actor.employeeId;
      }
    }

    return this.attendanceRepo.listRecords({
      employeeId: targetEmployeeId,
      startDate: filter.startDate,
      endDate: filter.endDate,
    });
  }

  /**
   * Get today's attendance record for authenticated user or specified employee
   */
  async getTodayAttendanceRecord(
    employeeId: string,
    actor: AuthenticatedUser
  ): Promise<AttendanceRecordDTO | null> {
    const isSelf = actor.employeeId === employeeId;
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isSelf && !isHr) {
      throw new ForbiddenError('You can only view your own attendance record');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    return this.attendanceRepo.findRecord(employeeId, todayStr);
  }

  /**
   * List all configured shifts
   */
  async listShifts(): Promise<ShiftDTO[]> {
    return this.attendanceRepo.listShifts();
  }

  /**
   * Create a new shift definition (HR / Admin only)
   */
  async createShift(
    params: {
      code: string;
      name: string;
      startTime: string;
      endTime: string;
      gracePeriodMins?: number;
      halfDayThreshold?: number;
      fullDayThreshold?: number;
      isOvernight?: boolean;
      weeklyOffDays?: number[];
    },
    actor: AuthenticatedUser
  ): Promise<ShiftDTO> {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) {
      throw new ForbiddenError('Only HR Administrators can configure shifts');
    }

    const existing = await this.attendanceRepo.findShiftByCode(params.code);
    if (existing) {
      throw new ConflictError(`Shift with code ${params.code} already exists`);
    }

    const now = new Date();
    const newShift: ShiftDTO = {
      id: randomUUID(),
      code: params.code,
      name: params.name,
      startTime: params.startTime,
      endTime: params.endTime,
      gracePeriodMins: params.gracePeriodMins ?? 15,
      halfDayThreshold: params.halfDayThreshold ?? 4.5,
      fullDayThreshold: params.fullDayThreshold ?? 8.0,
      isOvernight: params.isOvernight ?? false,
      weeklyOffDays: params.weeklyOffDays ?? [0, 6],
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };

    return this.attendanceRepo.saveShift(newShift);
  }

  /**
   * List regularizations based on role scope
   */
  async listRegularizations(
    filter: { employeeId?: string; status?: string },
    actor: AuthenticatedUser
  ): Promise<RegularizationDTO[]> {
    const isHrOrAdmin = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    let employeeId = filter.employeeId;

    if (!isHrOrAdmin && actor.role !== UserRole.REPORTING_MANAGER && actor.role !== UserRole.SENIOR_MANAGER) {
      // Regular employees can only view their own requests
      employeeId = actor.employeeId;
    }

    return this.attendanceRepo.listRegularizations({
      employeeId,
      status: filter.status,
    });
  }

  /**
   * Manual Attendance Entry (HR Admin / Super Admin)
   */
  async createManualAttendance(
    params: {
      employeeId: string;
      date: string;
      checkInTime: string;
      checkOutTime: string;
      shiftId?: string;
      workMode?: 'Office' | 'Client_Site' | 'Remote';
      status?: 'Present' | 'Late' | 'Half_Day' | 'Overtime' | 'Absent';
      notes?: string;
    },
    actor: AuthenticatedUser
  ): Promise<AttendanceRecordDTO> {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) {
      throw new ForbiddenError('Only HR Administrators can manually record employee attendance');
    }

    const checkIn = new Date(params.checkInTime);
    const checkOut = new Date(params.checkOutTime);
    const diffHours = Math.max(0, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60));

    let record = await this.attendanceRepo.findRecord(params.employeeId, params.date);
    const now = new Date();

    if (!record) {
      record = {
        id: randomUUID(),
        employeeId: params.employeeId,
        date: params.date,
        shiftId: params.shiftId || 'SHIFT-GEN',
        workMode: params.workMode || 'Office',
        checkInTime: params.checkInTime,
        checkOutTime: params.checkOutTime,
        breakDurationMinutes: 60,
        totalWorkingHours: Math.round(diffHours * 100) / 100,
        overtimeHours: diffHours > 9 ? Math.round((diffHours - 9) * 100) / 100 : 0,
        status: params.status || 'Present',
        isLate: false,
        isEarlyDeparture: false,
        notes: params.notes || `Manually entered by ${actor.email}`,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      record.checkInTime = params.checkInTime;
      record.checkOutTime = params.checkOutTime;
      record.totalWorkingHours = Math.round(diffHours * 100) / 100;
      record.overtimeHours = diffHours > 9 ? Math.round((diffHours - 9) * 100) / 100 : 0;
      if (params.shiftId) record.shiftId = params.shiftId;
      if (params.workMode) record.workMode = params.workMode;
      if (params.status) record.status = params.status;
      record.notes = params.notes || `Updated manually by ${actor.email}`;
      record.updatedAt = now;
    }

    return this.attendanceRepo.saveRecord(record);
  }

  /**
   * List Leave Applications (Scoped to Employee self, Manager reports, or HR org)
   */
  async listLeaveApplications(
    filter: { employeeId?: string; status?: string },
    actor: AuthenticatedUser
  ): Promise<LeaveApplicationDTO[]> {
    const isHrOrAdmin = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    let employeeId = filter.employeeId;

    if (!isHrOrAdmin) {
      if (actor.role === UserRole.REPORTING_MANAGER || actor.role === UserRole.SENIOR_MANAGER) {
        if (!employeeId) employeeId = actor.employeeId;
      } else {
        employeeId = actor.employeeId;
      }
    }

    return this.attendanceRepo.listLeaveApplications({
      employeeId,
      status: filter.status,
    });
  }

  /**
   * Cancel or Withdraw Leave Application
   */
  async cancelLeave(
    applicationId: string,
    reason: string | undefined,
    actor: AuthenticatedUser
  ): Promise<LeaveApplicationDTO> {
    const app = await this.attendanceRepo.findLeaveApplication(applicationId);
    if (!app) throw new NotFoundError(`Leave application ${applicationId} not found`);

    const isSelf = actor.employeeId === app.employeeId;
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isSelf && !isHr) {
      throw new ForbiddenError('You can only cancel your own leave requests or be an HR Administrator');
    }

    if (app.status === 'Cancelled' || app.status === 'Rejected') {
      throw new ValidationError(`Leave request is already ${app.status.toLowerCase()}`);
    }

    const year = new Date(app.startDate).getFullYear();
    const balance = await this.attendanceRepo.findLeaveBalance(app.employeeId, app.leaveTypeId, year);

    if (app.status === 'Pending') {
      // Pending request withdrawal restores pendingDays
      if (balance) {
        balance.pendingDays = Math.max(0, balance.pendingDays - app.totalDays);
        await this.attendanceRepo.saveLeaveBalance(balance);
      }
    } else if (app.status === 'Approved') {
      // Approved future leave cancellation (only HR or employee before start) restores usedDays
      const todayStr = new Date().toISOString().split('T')[0];
      if (app.startDate < todayStr && !isHr) {
        throw new ValidationError('Past or ongoing approved leave can only be modified by HR Administration');
      }

      if (balance) {
        balance.usedDays = Math.max(0, balance.usedDays - app.totalDays);
        await this.attendanceRepo.saveLeaveBalance(balance);
      }

      // Publish event for calendar and payroll restoration
      if (this.eventBus) {
        await this.eventBus.publish(
          'leave.cancelled',
          createEvent('LEAVE_CANCELLED', app.id, 'Leave', {
            leaveApplicationId: app.id,
            employeeId: app.employeeId,
            startDate: app.startDate,
            endDate: app.endDate,
            totalDays: app.totalDays,
            leaveTypeId: app.leaveTypeId,
            cancelledBy: actor.id,
          })
        );
      }
    }

    app.status = 'Cancelled';
    app.rejectionReason = reason || `Cancelled by ${actor.email}`;
    app.updatedAt = new Date();

    return this.attendanceRepo.saveLeaveApplication(app);
  }

  /**
   * List Employee Leave Balances
   */
  async listLeaveBalances(
    employeeId: string | undefined,
    year: number | undefined,
    actor: AuthenticatedUser
  ): Promise<LeaveBalanceDTO[]> {
    const isHrOrAdmin = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    let targetEmployeeId = employeeId || actor.employeeId;

    if (!targetEmployeeId) {
      return [];
    }

    if (!isHrOrAdmin && actor.employeeId !== targetEmployeeId) {
      throw new ForbiddenError('You can only view your own leave balances');
    }

    const targetYear = year || new Date().getFullYear();
    return this.attendanceRepo.listLeaveBalances(targetEmployeeId, targetYear);
  }

  /**
   * List Leave Types
   */
  async listLeaveTypes(): Promise<LeaveTypeDTO[]> {
    return this.attendanceRepo.listLeaveTypes();
  }

  /**
   * Create Leave Type (HR Admin / Super Admin)
   */
  async createLeaveType(
    params: {
      code: string;
      name: string;
      description?: string;
      isPaid?: boolean;
      annualQuotaDays: number;
      isCarryForward?: boolean;
      maxCarryForward?: number;
      maxConsecutiveDays?: number;
      allowsHalfDay?: boolean;
      requiresDoc?: boolean;
      isEncashable?: boolean;
      eligibilityCriteria?: string;
      effectiveDate?: string;
    },
    actor: AuthenticatedUser
  ): Promise<LeaveTypeDTO> {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) throw new ForbiddenError('Only HR Administrators can configure leave types');

    const existing = await this.attendanceRepo.findLeaveTypeByCode(params.code);
    if (existing) {
      throw new ConflictError(`Leave type with code ${params.code} already exists`);
    }

    const now = new Date();
    const newType: LeaveTypeDTO = {
      id: `LT-${params.code.toUpperCase()}`,
      code: params.code.toUpperCase(),
      name: params.name,
      description: params.description,
      isPaid: params.isPaid ?? true,
      annualQuotaDays: params.annualQuotaDays,
      isCarryForward: params.isCarryForward ?? false,
      maxCarryForward: params.maxCarryForward ?? 0,
      maxConsecutiveDays: params.maxConsecutiveDays ?? 30,
      allowsHalfDay: params.allowsHalfDay ?? true,
      requiresDoc: params.requiresDoc ?? false,
      isEncashable: params.isEncashable ?? false,
      eligibilityCriteria: params.eligibilityCriteria || 'All Active Employees',
      effectiveDate: params.effectiveDate || new Date().toISOString().split('T')[0],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return this.attendanceRepo.saveLeaveType(newType);
  }

  /**
   * Update Leave Type
   */
  async updateLeaveType(
    id: string,
    params: Partial<LeaveTypeDTO>,
    actor: AuthenticatedUser
  ): Promise<LeaveTypeDTO> {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) throw new ForbiddenError('Only HR Administrators can update leave types');

    const existing = await this.attendanceRepo.findLeaveType(id);
    if (!existing) throw new NotFoundError(`Leave type ${id} not found`);

    const updated: LeaveTypeDTO = {
      ...existing,
      ...params,
      id: existing.id,
      code: existing.code,
      updatedAt: new Date(),
    };

    return this.attendanceRepo.saveLeaveType(updated);
  }

  /**
   * List Holidays for a year
   */
  async listHolidays(year: number | undefined, branchId: string | undefined): Promise<HolidayDTO[]> {
    const targetYear = year || new Date().getFullYear();
    return this.attendanceRepo.listHolidays(targetYear, branchId);
  }

  /**
   * Create Holiday
   */
  async createHoliday(
    params: {
      name: string;
      date: string;
      branchId?: string;
      isOptional?: boolean;
      year: number;
      description?: string;
    },
    actor: AuthenticatedUser
  ): Promise<HolidayDTO> {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) throw new ForbiddenError('Only HR Administrators can configure company holidays');

    const now = new Date();
    const holiday: HolidayDTO = {
      id: `HOL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: params.name,
      date: params.date,
      branchId: params.branchId,
      isOptional: params.isOptional ?? false,
      year: params.year,
      description: params.description,
      createdAt: now,
      updatedAt: now,
    };

    return this.attendanceRepo.saveHoliday(holiday);
  }

  /**
   * Delete Holiday
   */
  async deleteHoliday(id: string, actor: AuthenticatedUser): Promise<void> {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) throw new ForbiddenError('Only HR Administrators can delete company holidays');

    await this.attendanceRepo.deleteHoliday(id);
  }
}
