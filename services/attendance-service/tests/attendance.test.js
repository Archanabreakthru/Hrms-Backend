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
