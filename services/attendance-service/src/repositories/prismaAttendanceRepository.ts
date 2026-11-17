import { PrismaClient } from '../generated/client';
import {
  IAttendanceRepository,
  AttendanceRecordDTO,
  ShiftDTO,
  ShiftScheduleDTO,
  HolidayDTO,
  LeaveTypeDTO,
  LeaveBalanceDTO,
  LeaveApplicationDTO,
  RegularizationDTO,
} from './attendanceRepository';

export class PrismaAttendanceRepository implements IAttendanceRepository {
  constructor(private prisma: PrismaClient) {}

  async findRecord(employeeId: string, dateStr: string): Promise<AttendanceRecordDTO | null> {
    const d = new Date(dateStr);
    const rec = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        date: d,
      },
    });
    if (!rec) return null;
    return this.mapRecord(rec);
  }

  async findRecordById(id: string): Promise<AttendanceRecordDTO | null> {
    const rec = await this.prisma.attendanceRecord.findUnique({
      where: { id },
    });
    if (!rec) return null;
    return this.mapRecord(rec);
  }

  async saveRecord(record: AttendanceRecordDTO): Promise<AttendanceRecordDTO> {
    const d = new Date(record.date);
    const data = {
      employeeId: record.employeeId,
      date: d,
      shiftId: record.shiftId,
      workMode: record.workMode,
      checkInTime: record.checkInTime ? new Date(record.checkInTime) : null,
      checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
      breakDurationMinutes: record.breakDurationMinutes,
      totalWorkingHours: record.totalWorkingHours,
      overtimeHours: record.overtimeHours,
      status: record.status,
      isLate: record.isLate,
      isEarlyDeparture: record.isEarlyDeparture,
      checkInPhotoUrl: record.checkInPhotoUrl || null,
      checkOutPhotoUrl: record.checkOutPhotoUrl || null,
      checkInLatitude: record.checkInLatitude || null,
      checkInLongitude: record.checkInLongitude || null,
      checkOutLatitude: record.checkOutLatitude || null,
      checkOutLongitude: record.checkOutLongitude || null,
      notes: record.notes || null,
    };

    const saved = await this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: record.employeeId,
          date: d,
        },
      },
      create: {
        id: record.id,
        ...data,
      },
      update: data,
    });

    return this.mapRecord(saved);
  }

  async listRecords(filter: { employeeId?: string; startDate?: string; endDate?: string }): Promise<AttendanceRecordDTO[]> {
    const where: any = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.startDate || filter.endDate) {
      where.date = {};
      if (filter.startDate) where.date.gte = new Date(filter.startDate);
      if (filter.endDate) where.date.lte = new Date(filter.endDate);
    }

    const recs = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return recs.map((r: any) => this.mapRecord(r));
  }

  async findShift(shiftId: string): Promise<ShiftDTO | null> {
    const s = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });
    if (!s) return null;
    return this.mapShift(s);
  }

  async findShiftByCode(code: string): Promise<ShiftDTO | null> {
    const s = await this.prisma.shift.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!s) return null;
    return this.mapShift(s);
  }

  async saveShift(shift: ShiftDTO): Promise<ShiftDTO> {
    const data = {
      code: shift.code.toUpperCase(),
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodMins: shift.gracePeriodMins,
      halfDayThreshold: shift.halfDayThreshold,
      fullDayThreshold: shift.fullDayThreshold,
      isOvernight: shift.isOvernight,
      weeklyOffDays: shift.weeklyOffDays,
      status: shift.status || 'Active',
    };

    const saved = await this.prisma.shift.upsert({
      where: { code: shift.code.toUpperCase() },
      create: {
        id: shift.id,
        ...data,
      },
      update: data,
    });

    return this.mapShift(saved);
  }

  async listShifts(): Promise<ShiftDTO[]> {
    const shifts = await this.prisma.shift.findMany({
      orderBy: { code: 'asc' },
    });
    return shifts.map((s: any) => this.mapShift(s));
  }

  async listHolidays(year: number, branchId?: string): Promise<HolidayDTO[]> {
    const where: any = { year };
    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }
    const holidays = await this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    return holidays.map((h: any) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString().split('T')[0],
      branchId: h.branchId || undefined,
      isOptional: h.isOptional,
      year: h.year,
      description: h.description || undefined,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    }));
  }

  async saveHoliday(holiday: HolidayDTO): Promise<HolidayDTO> {
    const d = new Date(holiday.date);
    const saved = await this.prisma.holiday.create({
      data: {
        id: holiday.id,
        name: holiday.name,
        date: d,
        branchId: holiday.branchId || null,
        isOptional: holiday.isOptional,
        year: holiday.year,
        description: holiday.description || null,
      },
    });
    return {
      id: saved.id,
      name: saved.name,
      date: saved.date.toISOString().split('T')[0],
      branchId: saved.branchId || undefined,
      isOptional: saved.isOptional,
      year: saved.year,
      description: saved.description || undefined,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteHoliday(id: string): Promise<void> {
    await this.prisma.holiday.delete({ where: { id } });
  }

  async findLeaveType(id: string): Promise<LeaveTypeDTO | null> {
    const lt = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!lt) return null;
    return this.mapLeaveType(lt);
  }

  async findLeaveTypeByCode(code: string): Promise<LeaveTypeDTO | null> {
    const lt = await this.prisma.leaveType.findUnique({ where: { code: code.toUpperCase() } });
    if (!lt) return null;
    return this.mapLeaveType(lt);
  }

  async listLeaveTypes(): Promise<LeaveTypeDTO[]> {
    const list = await this.prisma.leaveType.findMany({
      orderBy: { code: 'asc' },
    });
    return list.map((lt: any) => this.mapLeaveType(lt));
  }

  async saveLeaveType(type: LeaveTypeDTO): Promise<LeaveTypeDTO> {
    const saved = await this.prisma.leaveType.upsert({
      where: { code: type.code.toUpperCase() },
      create: {
        id: type.id,
        code: type.code.toUpperCase(),
        name: type.name,
        description: type.description || null,
        isPaid: type.isPaid,
        annualQuotaDays: type.annualQuotaDays,
        isCarryForward: type.isCarryForward,
        maxCarryForward: type.maxCarryForward,
        maxConsecutiveDays: type.maxConsecutiveDays,
        allowsHalfDay: type.allowsHalfDay,
        requiresDoc: type.requiresDoc,
        isEncashable: type.isEncashable,
        eligibilityCriteria: type.eligibilityCriteria || 'All Active Employees',
        effectiveDate: new Date(type.effectiveDate || Date.now()),
        isActive: type.isActive,
      },
      update: {
        name: type.name,
        description: type.description || null,
        isPaid: type.isPaid,
        annualQuotaDays: type.annualQuotaDays,
        isCarryForward: type.isCarryForward,
        maxCarryForward: type.maxCarryForward,
        maxConsecutiveDays: type.maxConsecutiveDays,
        allowsHalfDay: type.allowsHalfDay,
        requiresDoc: type.requiresDoc,
        isEncashable: type.isEncashable,
        eligibilityCriteria: type.eligibilityCriteria || 'All Active Employees',
        isActive: type.isActive,
      },
    });
    return this.mapLeaveType(saved);
  }

  private mapLeaveType(lt: any): LeaveTypeDTO {
    return {
      id: lt.id,
      code: lt.code,
      name: lt.name,
      description: lt.description || undefined,
      isPaid: lt.isPaid,
      annualQuotaDays: Number(lt.annualQuotaDays),
      isCarryForward: lt.isCarryForward,
      maxCarryForward: Number(lt.maxCarryForward),
      maxConsecutiveDays: lt.maxConsecutiveDays,
      allowsHalfDay: lt.allowsHalfDay,
      requiresDoc: lt.requiresDoc,
      isEncashable: lt.isEncashable,
      eligibilityCriteria: lt.eligibilityCriteria,
      effectiveDate: lt.effectiveDate instanceof Date ? lt.effectiveDate.toISOString().split('T')[0] : String(lt.effectiveDate),
      isActive: lt.isActive,
      createdAt: lt.createdAt,
      updatedAt: lt.updatedAt,
    };
  }

  async findLeaveBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalanceDTO | null> {
    const b = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year,
        },
      },
    });
    if (!b) return null;
    return {
      id: b.id,
      employeeId: b.employeeId,
      leaveTypeId: b.leaveTypeId,
      year: b.year,
      allocatedDays: b.allocatedDays,
      usedDays: b.usedDays,
      pendingDays: b.pendingDays,
      carriedForward: b.carriedForward,
      availableDays: b.allocatedDays + b.carriedForward - b.usedDays - b.pendingDays,
    };
  }

  async listLeaveBalances(employeeId: string, year: number): Promise<LeaveBalanceDTO[]> {
    const list = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
    });
    return list.map((b: any) => ({
      id: b.id,
      employeeId: b.employeeId,
      leaveTypeId: b.leaveTypeId,
      year: b.year,
      allocatedDays: b.allocatedDays,
      usedDays: b.usedDays,
      pendingDays: b.pendingDays,
      carriedForward: b.carriedForward,
      availableDays: b.allocatedDays + b.carriedForward - b.usedDays - b.pendingDays,
    }));
  }

  async saveLeaveBalance(balance: LeaveBalanceDTO): Promise<LeaveBalanceDTO> {
    const saved = await this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: balance.employeeId,
          leaveTypeId: balance.leaveTypeId,
          year: balance.year,
        },
      },
      create: {
        id: balance.id,
        employeeId: balance.employeeId,
        leaveTypeId: balance.leaveTypeId,
        year: balance.year,
        allocatedDays: balance.allocatedDays,
        usedDays: balance.usedDays,
        pendingDays: balance.pendingDays,
        carriedForward: balance.carriedForward,
      },
      update: {
        allocatedDays: balance.allocatedDays,
        usedDays: balance.usedDays,
        pendingDays: balance.pendingDays,
        carriedForward: balance.carriedForward,
      },
    });
    return {
      id: saved.id,
      employeeId: saved.employeeId,
      leaveTypeId: saved.leaveTypeId,
      year: saved.year,
      allocatedDays: saved.allocatedDays,
      usedDays: saved.usedDays,
      pendingDays: saved.pendingDays,
      carriedForward: saved.carriedForward,
      availableDays: saved.allocatedDays + saved.carriedForward - saved.usedDays - saved.pendingDays,
    };
  }

  async findLeaveApplication(id: string): Promise<LeaveApplicationDTO | null> {
    const app = await this.prisma.leaveApplication.findUnique({
      where: { id },
    });
    if (!app) return null;
    return this.mapLeaveApp(app);
  }

  async listLeaveApplications(filter: { employeeId?: string; status?: string }): Promise<LeaveApplicationDTO[]> {
    const where: any = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;

    const list = await this.prisma.leaveApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return list.map((a: any) => this.mapLeaveApp(a));
  }

  async saveLeaveApplication(app: LeaveApplicationDTO): Promise<LeaveApplicationDTO> {
    const saved = await this.prisma.leaveApplication.upsert({
      where: { id: app.id },
      create: {
        id: app.id,
        employeeId: app.employeeId,
        leaveTypeId: app.leaveTypeId,
        startDate: new Date(app.startDate),
        endDate: new Date(app.endDate),
        isHalfDay: app.isHalfDay,
        halfDaySession: app.halfDaySession || null,
        totalDays: app.totalDays,
        reason: app.reason,
        status: app.status as any,
        approvedBy: app.approvedBy || null,
        approvedAt: app.approvedAt || null,
        rejectionReason: app.rejectionReason || null,
      },
      update: {
        status: app.status as any,
        approvedBy: app.approvedBy || null,
        approvedAt: app.approvedAt || null,
        rejectionReason: app.rejectionReason || null,
      },
    });
    return this.mapLeaveApp(saved);
  }

  async findRegularization(id: string): Promise<RegularizationDTO | null> {
    const reg = await this.prisma.attendanceRegularization.findUnique({
      where: { id },
    });
    if (!reg) return null;
    return this.mapReg(reg);
  }

  async saveRegularization(reg: RegularizationDTO): Promise<RegularizationDTO> {
    const targetDate = reg.targetDate ? new Date(reg.targetDate) : new Date(reg.requestedCheckIn.split('T')[0]);
    const saved = await this.prisma.attendanceRegularization.upsert({
      where: { id: reg.id },
      create: {
        id: reg.id,
        attendanceRecordId: reg.attendanceRecordId || null,
        employeeId: reg.employeeId,
        targetDate,
        requestedCheckIn: new Date(reg.requestedCheckIn),
        requestedCheckOut: new Date(reg.requestedCheckOut),
        reason: reg.reason,
        status: reg.status,
        reviewedBy: reg.reviewedBy || null,
        reviewedAt: reg.reviewedAt || null,
        reviewRemarks: reg.reviewRemarks || null,
      },
      update: {
        status: reg.status,
        reviewedBy: reg.reviewedBy || null,
        reviewedAt: reg.reviewedAt || null,
        reviewRemarks: reg.reviewRemarks || null,
      },
    });
    return this.mapReg(saved);
  }

  async listRegularizations(filter: { employeeId?: string; status?: string }): Promise<RegularizationDTO[]> {
    const where: any = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;

    const list = await this.prisma.attendanceRegularization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return list.map((r: any) => this.mapReg(r));
  }

  async saveShiftSchedule(schedule: ShiftScheduleDTO): Promise<ShiftScheduleDTO> {
    const saved = await this.prisma.shiftSchedule.upsert({
      where: { id: schedule.id },
      create: {
        id: schedule.id,
        employeeId: schedule.employeeId,
        shiftId: schedule.shiftId,
        effectiveFrom: new Date(schedule.effectiveFrom),
        effectiveTo: schedule.effectiveTo ? new Date(schedule.effectiveTo) : null,
        assignedBy: schedule.assignedBy,
        isActive: schedule.isActive !== undefined ? schedule.isActive : true,
      },
      update: {
        shiftId: schedule.shiftId,
        effectiveFrom: new Date(schedule.effectiveFrom),
        effectiveTo: schedule.effectiveTo ? new Date(schedule.effectiveTo) : null,
        assignedBy: schedule.assignedBy,
        isActive: schedule.isActive !== undefined ? schedule.isActive : true,
      },
    });
    return {
      id: saved.id,
      employeeId: saved.employeeId,
      shiftId: saved.shiftId,
      effectiveFrom: saved.effectiveFrom.toISOString().split('T')[0],
      effectiveTo: saved.effectiveTo ? saved.effectiveTo.toISOString().split('T')[0] : undefined,
      assignedBy: saved.assignedBy,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async listShiftSchedules(filter: { employeeId?: string; shiftId?: string; isActive?: boolean }): Promise<ShiftScheduleDTO[]> {
    const where: any = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.shiftId) where.shiftId = filter.shiftId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    const list = await this.prisma.shiftSchedule.findMany({
      where,
      orderBy: { effectiveFrom: 'desc' },
    });
    return list.map((s: any) => ({
      id: s.id,
      employeeId: s.employeeId,
      shiftId: s.shiftId,
      effectiveFrom: s.effectiveFrom.toISOString().split('T')[0],
      effectiveTo: s.effectiveTo ? s.effectiveTo.toISOString().split('T')[0] : undefined,
      assignedBy: s.assignedBy,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  private mapRecord(r: any): AttendanceRecordDTO {
    return {
      id: r.id,
      employeeId: r.employeeId,
      date: r.date.toISOString().split('T')[0],
      shiftId: r.shiftId,
      workMode: r.workMode,
      checkInTime: r.checkInTime ? r.checkInTime.toISOString() : undefined,
      checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : undefined,
      breakDurationMinutes: r.breakDurationMinutes,
      totalWorkingHours: r.totalWorkingHours,
      overtimeHours: r.overtimeHours,
      status: r.status,
      isLate: r.isLate,
      isEarlyDeparture: r.isEarlyDeparture,
      checkInPhotoUrl: r.checkInPhotoUrl || undefined,
      checkOutPhotoUrl: r.checkOutPhotoUrl || undefined,
      checkInLatitude: r.checkInLatitude || undefined,
      checkInLongitude: r.checkInLongitude || undefined,
      checkOutLatitude: r.checkOutLatitude || undefined,
      checkOutLongitude: r.checkOutLongitude || undefined,
      notes: r.notes || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapShift(s: any): ShiftDTO {
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      gracePeriodMins: s.gracePeriodMins,
      halfDayThreshold: s.halfDayThreshold,
      fullDayThreshold: s.fullDayThreshold,
      isOvernight: s.isOvernight,
      weeklyOffDays: s.weeklyOffDays,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapLeaveApp(a: any): LeaveApplicationDTO {
    return {
      id: a.id,
      employeeId: a.employeeId,
      leaveTypeId: a.leaveTypeId,
      startDate: a.startDate.toISOString().split('T')[0],
      endDate: a.endDate.toISOString().split('T')[0],
      isHalfDay: a.isHalfDay,
      halfDaySession: a.halfDaySession || undefined,
      totalDays: a.totalDays,
      reason: a.reason,
      status: a.status,
      approvedBy: a.approvedBy || undefined,
      approvedAt: a.approvedAt || undefined,
      rejectionReason: a.rejectionReason || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  private mapReg(r: any): RegularizationDTO {
    return {
      id: r.id,
      attendanceRecordId: r.attendanceRecordId,
      employeeId: r.employeeId,
      requestedCheckIn: r.requestedCheckIn.toISOString(),
      requestedCheckOut: r.requestedCheckOut.toISOString(),
      reason: r.reason,
      status: r.status,
      reviewedBy: r.reviewedBy || undefined,
      reviewedAt: r.reviewedAt || undefined,
      reviewRemarks: r.reviewRemarks || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

