export interface AttendanceRecordDTO {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  shiftId: string;
  workMode: 'Office' | 'Client_Site' | 'Remote';
  checkInTime?: string;
  checkOutTime?: string;
  breakDurationMinutes: number;
  totalWorkingHours: number;
  overtimeHours: number;
  status: 'Present' | 'Late' | 'Half_Day' | 'Overtime' | 'Absent';
  isLate: boolean;
  isEarlyDeparture: boolean;
  checkInPhotoUrl?: string;
  checkOutPhotoUrl?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftDTO {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMins: number;
  halfDayThreshold: number;
  fullDayThreshold: number;
  isOvernight: boolean;
  weeklyOffDays: number[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HolidayDTO {
  id: string;
  name: string;
  date: string;
  branchId?: string;
  isOptional: boolean;
  year: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  carriedForward: number;
  availableDays: number;
}

export interface LeaveApplicationDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDaySession?: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegularizationDTO {
  id: string;
  attendanceRecordId: string;
  employeeId: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendanceRepository {
  findRecord(employeeId: string, date: string): Promise<AttendanceRecordDTO | null>;
  findRecordById(id: string): Promise<AttendanceRecordDTO | null>;
  saveRecord(record: AttendanceRecordDTO): Promise<AttendanceRecordDTO>;
  listRecords(filter: { employeeId?: string; startDate?: string; endDate?: string }): Promise<AttendanceRecordDTO[]>;

  findShift(shiftId: string): Promise<ShiftDTO | null>;
  findShiftByCode(code: string): Promise<ShiftDTO | null>;
  saveShift(shift: ShiftDTO): Promise<ShiftDTO>;
  listShifts(): Promise<ShiftDTO[]>;

  listHolidays(year: number, branchId?: string): Promise<HolidayDTO[]>;
  saveHoliday(holiday: HolidayDTO): Promise<HolidayDTO>;

  findLeaveBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalanceDTO | null>;
  listLeaveBalances(employeeId: string, year: number): Promise<LeaveBalanceDTO[]>;
  saveLeaveBalance(balance: LeaveBalanceDTO): Promise<LeaveBalanceDTO>;

  findLeaveApplication(id: string): Promise<LeaveApplicationDTO | null>;
  listLeaveApplications(filter: { employeeId?: string; status?: string }): Promise<LeaveApplicationDTO[]>;
  saveLeaveApplication(app: LeaveApplicationDTO): Promise<LeaveApplicationDTO>;

  findRegularization(id: string): Promise<RegularizationDTO | null>;
  saveRegularization(reg: RegularizationDTO): Promise<RegularizationDTO>;
  listRegularizations(filter: { employeeId?: string; status?: string }): Promise<RegularizationDTO[]>;
}

export class InMemoryAttendanceRepository implements IAttendanceRepository {
  private records = new Map<string, AttendanceRecordDTO>(); // key: `${employeeId}_${date}`
  private shifts = new Map<string, ShiftDTO>();
  private holidays = new Map<string, HolidayDTO>();
  private leaveBalances = new Map<string, LeaveBalanceDTO>(); // key: `${employeeId}_${leaveTypeId}_${year}`
  private leaveApplications = new Map<string, LeaveApplicationDTO>();
  private regularizations = new Map<string, RegularizationDTO>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const now = new Date();
    const defaultShift: ShiftDTO = {
      id: 'SHIFT-GEN',
      code: 'GEN',
      name: 'General Day Shift (09:30 - 18:30)',
      startTime: '09:30',
      endTime: '18:30',
      gracePeriodMins: 15,
      halfDayThreshold: 4.5,
      fullDayThreshold: 8.0,
      isOvernight: false,
      weeklyOffDays: [0, 6], // Sun, Sat
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };
    this.shifts.set(defaultShift.id, defaultShift);
    this.shifts.set(defaultShift.code, defaultShift);

    const h1: HolidayDTO = {
      id: 'HOL-001',
      name: 'Republic Day',
      date: '2026-01-26',
      year: 2026,
      isOptional: false,
      createdAt: now,
      updatedAt: now,
    };
    this.holidays.set(h1.id, h1);
  }

  async findRecord(employeeId: string, date: string): Promise<AttendanceRecordDTO | null> {
    return this.records.get(`${employeeId}_${date}`) || null;
  }

  async findRecordById(id: string): Promise<AttendanceRecordDTO | null> {
    for (const r of this.records.values()) {
      if (r.id === id) return r;
    }
    return null;
  }

  async saveRecord(record: AttendanceRecordDTO): Promise<AttendanceRecordDTO> {
    this.records.set(`${record.employeeId}_${record.date}`, { ...record });
    return record;
  }

  async listRecords(filter: { employeeId?: string; startDate?: string; endDate?: string }): Promise<AttendanceRecordDTO[]> {
    let list = Array.from(this.records.values());
    if (filter.employeeId) list = list.filter((r) => r.employeeId === filter.employeeId);
    if (filter.startDate) list = list.filter((r) => r.date >= filter.startDate!);
    if (filter.endDate) list = list.filter((r) => r.date <= filter.endDate!);
    return list;
  }

  async findShift(shiftId: string): Promise<ShiftDTO | null> {
    return this.shifts.get(shiftId) || null;
  }

  async findShiftByCode(code: string): Promise<ShiftDTO | null> {
    return this.shifts.get(code.toUpperCase().trim()) || null;
  }

  async saveShift(shift: ShiftDTO): Promise<ShiftDTO> {
    this.shifts.set(shift.id, { ...shift });
    this.shifts.set(shift.code, { ...shift });
    return shift;
  }

  async listShifts(): Promise<ShiftDTO[]> {
    return Array.from(new Set(this.shifts.values()));
  }

  async listHolidays(year: number, branchId?: string): Promise<HolidayDTO[]> {
    let list = Array.from(this.holidays.values()).filter((h) => h.year === year);
    if (branchId) list = list.filter((h) => !h.branchId || h.branchId === branchId);
    return list;
  }

  async saveHoliday(holiday: HolidayDTO): Promise<HolidayDTO> {
    this.holidays.set(holiday.id, { ...holiday });
    return holiday;
  }

  async findLeaveBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalanceDTO | null> {
    const key = `${employeeId}_${leaveTypeId}_${year}`;
    const bal = this.leaveBalances.get(key);
    if (bal) return bal;

    // Initialize default quota if not set
    const defaultBal: LeaveBalanceDTO = {
      id: `bal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId,
      leaveTypeId,
      year,
      allocatedDays: 12,
      usedDays: 0,
      pendingDays: 0,
      carriedForward: 0,
      availableDays: 12,
    };
    this.leaveBalances.set(key, defaultBal);
    return defaultBal;
  }

  async listLeaveBalances(employeeId: string, year: number): Promise<LeaveBalanceDTO[]> {
    // Return standard balances for CL, SL, EL
    const types = ['CL', 'SL', 'EL'];
    for (const t of types) {
      await this.findLeaveBalance(employeeId, t, year);
    }
    return Array.from(this.leaveBalances.values()).filter(
      (b) => b.employeeId === employeeId && b.year === year
    );
  }

  async saveLeaveBalance(balance: LeaveBalanceDTO): Promise<LeaveBalanceDTO> {
    const key = `${balance.employeeId}_${balance.leaveTypeId}_${balance.year}`;
    balance.availableDays = balance.allocatedDays + balance.carriedForward - balance.usedDays - balance.pendingDays;
    this.leaveBalances.set(key, { ...balance });
    return balance;
  }

  async findLeaveApplication(id: string): Promise<LeaveApplicationDTO | null> {
    return this.leaveApplications.get(id) || null;
  }

  async listLeaveApplications(filter: { employeeId?: string; status?: string }): Promise<LeaveApplicationDTO[]> {
    let list = Array.from(this.leaveApplications.values());
    if (filter.employeeId) list = list.filter((a) => a.employeeId === filter.employeeId);
    if (filter.status) list = list.filter((a) => a.status === filter.status);
    return list;
  }

  async saveLeaveApplication(app: LeaveApplicationDTO): Promise<LeaveApplicationDTO> {
    this.leaveApplications.set(app.id, { ...app });
    return app;
  }

  async findRegularization(id: string): Promise<RegularizationDTO | null> {
    return this.regularizations.get(id) || null;
  }

  async saveRegularization(reg: RegularizationDTO): Promise<RegularizationDTO> {
    this.regularizations.set(reg.id, { ...reg });
    return reg;
  }

  async listRegularizations(filter: { employeeId?: string; status?: string }): Promise<RegularizationDTO[]> {
    let list = Array.from(this.regularizations.values());
    if (filter.employeeId) list = list.filter((r) => r.employeeId === filter.employeeId);
    if (filter.status) list = list.filter((r) => r.status === filter.status);
    return list;
  }
}

