"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const attendanceService_1 = require("../src/services/attendanceService");
const attendanceRepository_1 = require("../src/repositories/attendanceRepository");
const roles_1 = require("../../../shared/src/constants/roles");
const mockEmployeeUser = {
    id: 'usr-1',
    email: 'john@orbyx.io',
    role: roles_1.UserRole.EMPLOYEE,
    employeeId: 'EMP-SWE-0001',
    permissions: ['attendance.punch_self', 'attendance.regularize_self', 'leave.apply_self'],
};
const mockManagerUser = {
    id: 'usr-mgr-1',
    email: 'mgr@orbyx.io',
    role: roles_1.UserRole.REPORTING_MANAGER,
    employeeId: 'EMP-MD-0001',
    permissions: ['attendance.approve_team', 'leave.approve_team'],
};
(0, node_test_1.default)('AttendanceService handles Clock-In and Clock-Out with net hours and late arrival detection', async () => {
    const repo = new attendanceRepository_1.InMemoryAttendanceRepository();
    const service = new attendanceService_1.AttendanceService(repo);
    // Clock-in at 09:30 AM (on time for 09:30 shift)
    const inRecord = await service.punchClock({
        employeeId: 'EMP-SWE-0001',
        date: '2026-11-10',
        punchType: 'IN',
        timestamp: '2026-11-10T09:30:00Z',
        workMode: 'Office',
        shiftId: 'SHIFT-GEN',
    }, mockEmployeeUser);
    strict_1.default.equal(inRecord.status, 'Present');
    strict_1.default.equal(inRecord.isLate, false);
    // Duplicate clock-in is rejected
    await strict_1.default.rejects(async () => {
        await service.punchClock({
            employeeId: 'EMP-SWE-0001',
            date: '2026-11-10',
            punchType: 'IN',
            timestamp: '2026-11-10T09:35:00Z',
        }, mockEmployeeUser);
    }, {
        name: 'ConflictError',
    });
    // Clock-out at 18:30 PM (9 gross hours - 1 hr break = 8 net hours -> Full Day Present)
    const outRecord = await service.punchClock({
        employeeId: 'EMP-SWE-0001',
        date: '2026-11-10',
        punchType: 'OUT',
        timestamp: '2026-11-10T18:30:00Z',
    }, mockEmployeeUser);
    strict_1.default.equal(outRecord.totalWorkingHours, 8);
    strict_1.default.equal(outRecord.status, 'Present');
    strict_1.default.equal(outRecord.isEarlyDeparture, false);
});
(0, node_test_1.default)('AttendanceService leave application checks balance and deducts upon approval', async () => {
    const repo = new attendanceRepository_1.InMemoryAttendanceRepository();
    const service = new attendanceService_1.AttendanceService(repo);
    // Initial balance is 12 days
    const app = await service.applyLeave({
        employeeId: 'EMP-SWE-0001',
        leaveTypeId: 'CL',
        startDate: '2026-12-01',
        endDate: '2026-12-02', // 2 days
        isHalfDay: false,
        reason: 'Personal errand',
    }, mockEmployeeUser);
    strict_1.default.equal(app.status, 'Pending');
    strict_1.default.equal(app.totalDays, 2);
    // Balance has 2 pending days
    const balBefore = await repo.findLeaveBalance('EMP-SWE-0001', 'CL', 2026);
    strict_1.default.equal(balBefore?.pendingDays, 2);
    strict_1.default.equal(balBefore?.availableDays, 10);
    // Manager approves leave
    const approved = await service.reviewLeave(app.id, 'Approved', undefined, mockManagerUser);
    strict_1.default.equal(approved.status, 'Approved');
    // Balance ledger updated: used = 2, pending = 0, available = 10
    const balAfter = await repo.findLeaveBalance('EMP-SWE-0001', 'CL', 2026);
    strict_1.default.equal(balAfter?.usedDays, 2);
    strict_1.default.equal(balAfter?.pendingDays, 0);
    strict_1.default.equal(balAfter?.availableDays, 10);
});
(0, node_test_1.default)('AttendanceService Phase 6C.1: shifts, manual entry, records list, and today query', async () => {
    const repo = new attendanceRepository_1.InMemoryAttendanceRepository();
    const service = new attendanceService_1.AttendanceService(repo);
    const mockHrUser = {
        id: 'usr-hr-1',
        email: 'hr@orbyx.io',
        role: roles_1.UserRole.HR_ADMIN,
        employeeId: 'EMP-HR-0001',
        permissions: [
            'attendance.punch_self',
            'attendance.read_team',
            'attendance.read_all',
            'shifts.roster.manage',
            'attendance.approve_all',
        ],
    };
    // 1. Shift Listing & Creation
    const initialShifts = await service.listShifts();
    strict_1.default.ok(initialShifts.length >= 1);
    strict_1.default.equal(initialShifts[0].code, 'GEN');
    const newShift = await service.createShift({
        code: 'NIGHT',
        name: 'Night Shift (20:00 - 05:00)',
        startTime: '20:00',
        endTime: '05:00',
        isOvernight: true,
    }, mockHrUser);
    strict_1.default.equal(newShift.code, 'NIGHT');
    // 2. HR Manual Attendance Entry
    const manualRecord = await service.createManualAttendance({
        employeeId: 'EMP-SWE-0001',
        date: '2026-11-12',
        checkInTime: '2026-11-12T09:00:00Z',
        checkOutTime: '2026-11-12T18:00:00Z',
        shiftId: 'SHIFT-GEN',
        workMode: 'Office',
        status: 'Present',
        notes: 'Approved off-site client engagement',
    }, mockHrUser);
    strict_1.default.equal(manualRecord.status, 'Present');
    strict_1.default.equal(manualRecord.totalWorkingHours, 9);
    // 3. List Attendance Records with RBAC filter
    const employeeRecords = await service.listAttendanceRecords({ employeeId: 'EMP-SWE-0001' }, mockEmployeeUser);
    strict_1.default.equal(employeeRecords.length, 1);
    strict_1.default.equal(employeeRecords[0].employeeId, 'EMP-SWE-0001');
    // 4. Regularization Flow (Employee requests -> HR reviews)
    const reg = await service.requestRegularization({
        attendanceRecordId: manualRecord.id,
        employeeId: 'EMP-SWE-0001',
        requestedCheckIn: '2026-11-12T08:30:00Z',
        requestedCheckOut: '2026-11-12T18:30:00Z',
        reason: 'Forgot to swipe card at front gate',
    }, mockEmployeeUser);
    strict_1.default.ok(reg.status.includes('Pending'));
    const regList = await service.listRegularizations({}, mockHrUser);
    strict_1.default.ok(regList.length >= 1);
    const reviewedReg = await service.reviewRegularization(reg.id, 'Approved', 'Valid explanation', mockHrUser);
    strict_1.default.ok(reviewedReg.status.includes('Approved'));
});
(0, node_test_1.default)('AttendanceService Phase 6C.2: leave cancellation, balances, leave types, and holidays', async () => {
    const repo = new attendanceRepository_1.InMemoryAttendanceRepository();
    const service = new attendanceService_1.AttendanceService(repo);
    const mockHrUser = {
        id: 'usr-hr-1',
        email: 'hr@orbyx.io',
        role: roles_1.UserRole.HR_ADMIN,
        employeeId: 'EMP-HR-0001',
        permissions: [
            'leave.apply_self',
            'leave.read_team',
            'leave.read_all',
            'leave.approve_all',
            'leave.policies.manage',
        ],
    };
    // 1. Leave Types CRUD
    const leaveTypes = await service.listLeaveTypes();
    strict_1.default.ok(leaveTypes.length >= 3);
    strict_1.default.equal(leaveTypes[0].code, 'CL');
    const newType = await service.createLeaveType({
        code: 'ML',
        name: 'Maternity Leave',
        annualQuotaDays: 180,
        allowsHalfDay: false,
    }, mockHrUser);
    strict_1.default.equal(newType.code, 'ML');
    // 2. Balances Query
    const balances = await service.listLeaveBalances('EMP-SWE-0001', 2026, mockEmployeeUser);
    strict_1.default.ok(balances.length >= 3);
    const clBalance = balances.find((b) => b.leaveTypeId === 'CL');
    strict_1.default.equal(clBalance?.availableDays, 12);
    // 3. Application & Withdrawal (Cancellation of Pending)
    const app = await service.applyLeave({
        employeeId: 'EMP-SWE-0001',
        leaveTypeId: 'CL',
        startDate: '2026-11-20',
        endDate: '2026-11-21',
        isHalfDay: false,
        reason: 'Personal function',
    }, mockEmployeeUser);
    strict_1.default.equal(app.status, 'Pending');
    // Balances reflect pending deduction
    const balAfterApply = await service.listLeaveBalances('EMP-SWE-0001', 2026, mockEmployeeUser);
    const clBalAfterApply = balAfterApply.find((b) => b.leaveTypeId === 'CL');
    strict_1.default.equal(clBalAfterApply?.pendingDays, 2);
    strict_1.default.equal(clBalAfterApply?.availableDays, 10);
    // Withdraw pending application
    const cancelledApp = await service.cancelLeave(app.id, 'No longer needed', mockEmployeeUser);
    strict_1.default.equal(cancelledApp.status, 'Cancelled');
    const balAfterCancel = await service.listLeaveBalances('EMP-SWE-0001', 2026, mockEmployeeUser);
    const clBalAfterCancel = balAfterCancel.find((b) => b.leaveTypeId === 'CL');
    strict_1.default.equal(clBalAfterCancel?.pendingDays, 0);
    strict_1.default.equal(clBalAfterCancel?.availableDays, 12);
    // 4. Holiday Management
    const initialHolidays = await service.listHolidays(2026, undefined);
    strict_1.default.ok(initialHolidays.length >= 1);
    const newHoliday = await service.createHoliday({
        name: 'Independence Day',
        date: '2026-08-15',
        year: 2026,
    }, mockHrUser);
    strict_1.default.equal(newHoliday.name, 'Independence Day');
    const updatedHolidays = await service.listHolidays(2026, undefined);
    strict_1.default.ok(updatedHolidays.length >= 2);
    await service.deleteHoliday(newHoliday.id, mockHrUser);
    const afterDeleteHolidays = await service.listHolidays(2026, undefined);
    strict_1.default.equal(afterDeleteHolidays.length, initialHolidays.length);
});
