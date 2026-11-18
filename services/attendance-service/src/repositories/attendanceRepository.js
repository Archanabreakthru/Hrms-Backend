"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAttendanceRepository = void 0;
class InMemoryAttendanceRepository {
    records = new Map(); // key: `${employeeId}_${date}`
    shifts = new Map();
    holidays = new Map();
    leaveBalances = new Map(); // key: `${employeeId}_${leaveTypeId}_${year}`
    leaveApplications = new Map();
    regularizations = new Map();
    leaveTypes = new Map();
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        const now = new Date();
        const defaultShift = {
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
        const h1 = {
            id: 'HOL-001',
            name: 'Republic Day',
            date: '2026-01-26',
            year: 2026,
            isOptional: false,
            createdAt: now,
            updatedAt: now,
        };
        this.holidays.set(h1.id, h1);
        const ltCL = {
            id: 'LT-CL',
            code: 'CL',
            name: 'Casual Leave',
            description: 'Casual leave for personal matters',
            isPaid: true,
            annualQuotaDays: 12,
            isCarryForward: false,
            maxCarryForward: 0,
            maxConsecutiveDays: 3,
            allowsHalfDay: true,
            requiresDoc: false,
            isEncashable: false,
            eligibilityCriteria: 'All Active Employees',
            effectiveDate: '2026-01-01',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };
        const ltSL = {
            id: 'LT-SL',
            code: 'SL',
            name: 'Sick Leave',
            description: 'Sick leave for medical illness',
            isPaid: true,
            annualQuotaDays: 10,
            isCarryForward: true,
            maxCarryForward: 5,
            maxConsecutiveDays: 7,
            allowsHalfDay: true,
            requiresDoc: true,
            isEncashable: false,
            eligibilityCriteria: 'All Active Employees',
            effectiveDate: '2026-01-01',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };
        const ltEL = {
            id: 'LT-EL',
            code: 'EL',
            name: 'Earned Leave',
            description: 'Privilege / Earned annual vacation leave',
            isPaid: true,
            annualQuotaDays: 15,
            isCarryForward: true,
            maxCarryForward: 30,
            maxConsecutiveDays: 14,
            allowsHalfDay: false,
            requiresDoc: false,
            isEncashable: true,
            eligibilityCriteria: 'All Active Employees',
            effectiveDate: '2026-01-01',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };
        this.leaveTypes.set(ltCL.id, ltCL);
        this.leaveTypes.set(ltCL.code, ltCL);
        this.leaveTypes.set(ltSL.id, ltSL);
        this.leaveTypes.set(ltSL.code, ltSL);
        this.leaveTypes.set(ltEL.id, ltEL);
        this.leaveTypes.set(ltEL.code, ltEL);
    }
    async findRecord(employeeId, date) {
        return this.records.get(`${employeeId}_${date}`) || null;
    }
    async findRecordById(id) {
        for (const r of this.records.values()) {
            if (r.id === id)
                return r;
        }
        return null;
    }
    async saveRecord(record) {
        this.records.set(`${record.employeeId}_${record.date}`, { ...record });
        return record;
    }
    async listRecords(filter) {
        let list = Array.from(this.records.values());
        if (filter.employeeId)
            list = list.filter((r) => r.employeeId === filter.employeeId);
        if (filter.startDate)
            list = list.filter((r) => r.date >= filter.startDate);
        if (filter.endDate)
            list = list.filter((r) => r.date <= filter.endDate);
        return list;
    }
    async findShift(shiftId) {
        return this.shifts.get(shiftId) || null;
    }
    async findShiftByCode(code) {
        return this.shifts.get(code.toUpperCase().trim()) || null;
    }
    async saveShift(shift) {
        this.shifts.set(shift.id, { ...shift });
        this.shifts.set(shift.code, { ...shift });
        return shift;
    }
    async listShifts() {
        return Array.from(new Set(this.shifts.values()));
    }
    async listHolidays(year, branchId) {
        let list = Array.from(this.holidays.values()).filter((h) => h.year === year);
        if (branchId)
            list = list.filter((h) => !h.branchId || h.branchId === branchId);
        return list;
    }
    async saveHoliday(holiday) {
        this.holidays.set(holiday.id, { ...holiday });
        return holiday;
    }
    async deleteHoliday(id) {
        this.holidays.delete(id);
    }
    async findLeaveType(id) {
        return this.leaveTypes.get(id) || null;
    }
    async findLeaveTypeByCode(code) {
        return this.leaveTypes.get(code.toUpperCase().trim()) || null;
    }
    async listLeaveTypes() {
        return Array.from(new Set(this.leaveTypes.values()));
    }
    async saveLeaveType(type) {
        this.leaveTypes.set(type.id, { ...type });
        this.leaveTypes.set(type.code, { ...type });
        return type;
    }
    async findLeaveBalance(employeeId, leaveTypeId, year) {
        const key = `${employeeId}_${leaveTypeId}_${year}`;
        const bal = this.leaveBalances.get(key);
        if (bal)
            return bal;
        // Initialize default quota if not set
        const defaultBal = {
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
    async listLeaveBalances(employeeId, year) {
        // Return standard balances for CL, SL, EL
        const types = ['CL', 'SL', 'EL'];
        for (const t of types) {
            await this.findLeaveBalance(employeeId, t, year);
        }
        return Array.from(this.leaveBalances.values()).filter((b) => b.employeeId === employeeId && b.year === year);
    }
    async saveLeaveBalance(balance) {
        const key = `${balance.employeeId}_${balance.leaveTypeId}_${balance.year}`;
        balance.availableDays = balance.allocatedDays + balance.carriedForward - balance.usedDays - balance.pendingDays;
        this.leaveBalances.set(key, { ...balance });
        return balance;
    }
    async findLeaveApplication(id) {
        return this.leaveApplications.get(id) || null;
    }
    async listLeaveApplications(filter) {
        let list = Array.from(this.leaveApplications.values());
        if (filter.employeeId)
            list = list.filter((a) => a.employeeId === filter.employeeId);
        if (filter.status)
            list = list.filter((a) => a.status === filter.status);
        return list;
    }
    async saveLeaveApplication(app) {
        this.leaveApplications.set(app.id, { ...app });
        return app;
    }
    async findRegularization(id) {
        return this.regularizations.get(id) || null;
    }
    async saveRegularization(reg) {
        this.regularizations.set(reg.id, { ...reg });
        return reg;
    }
    async listRegularizations(filter) {
        let list = Array.from(this.regularizations.values());
        if (filter.employeeId)
            list = list.filter((r) => r.employeeId === filter.employeeId);
        if (filter.status)
            list = list.filter((r) => r.status === filter.status);
        return list;
    }
    shiftSchedules = new Map();
    async saveShiftSchedule(schedule) {
        this.shiftSchedules.set(schedule.id, { ...schedule });
        return schedule;
    }
    async listShiftSchedules(filter) {
        let list = Array.from(this.shiftSchedules.values());
        if (filter.employeeId)
            list = list.filter((s) => s.employeeId === filter.employeeId);
        if (filter.shiftId)
            list = list.filter((s) => s.shiftId === filter.shiftId);
        if (filter.isActive !== undefined)
            list = list.filter((s) => s.isActive === filter.isActive);
        return list;
    }
}
exports.InMemoryAttendanceRepository = InMemoryAttendanceRepository;
