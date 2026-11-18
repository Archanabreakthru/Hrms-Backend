"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAttendanceRouter = createAttendanceRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const attendanceValidators_1 = require("../validators/attendanceValidators");
const env_1 = require("../config/env");
function createAttendanceRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // List attendance records (Filtered by date, employee; RBAC scoped)
    router.get('/records', authMiddleware, (0, auth_1.requirePermission)('attendance.punch_self', 'attendance.read_team', 'attendance.read_all'), controller.listRecords);
    // Today's attendance status for current employee
    router.get('/today', authMiddleware, (0, auth_1.requirePermission)('attendance.punch_self'), controller.getToday);
    // Punch clock (Self or HR Admin)
    router.post('/punch', authMiddleware, (0, auth_1.requirePermission)('attendance.punch_self'), (0, validation_1.validateRequest)(attendanceValidators_1.punchClockSchema), controller.punch);
    // Shifts management
    router.get('/shifts', authMiddleware, (0, auth_1.requirePermission)('attendance.punch_self', 'attendance.read_team', 'attendance.read_all'), controller.listShifts);
    router.post('/shifts', authMiddleware, (0, auth_1.requirePermission)('shifts.roster.manage'), (0, validation_1.validateRequest)(attendanceValidators_1.createShiftSchema), controller.createShift);
    // Shift Schedules / Roster management
    router.get('/schedules', authMiddleware, (0, auth_1.requirePermission)('attendance.punch_self', 'attendance.read_team', 'attendance.read_all', 'shifts.roster.manage'), controller.listShiftSchedules);
    router.post('/schedules', authMiddleware, (0, auth_1.requirePermission)('shifts.roster.manage'), controller.createShiftSchedule);
    // Attendance Regularization listing & creation
    router.get('/regularizations', authMiddleware, (0, auth_1.requirePermission)('attendance.regularize_self', 'attendance.approve_team', 'attendance.approve_all'), controller.listRegularizations);
    router.post('/regularize', authMiddleware, (0, auth_1.requirePermission)('attendance.regularize_self'), (0, validation_1.validateRequest)(attendanceValidators_1.regularizationSchema), controller.requestRegularization);
    router.put('/regularize/:id/review', authMiddleware, (0, auth_1.requirePermission)('attendance.approve_team', 'attendance.approve_all'), (0, validation_1.validateRequest)(attendanceValidators_1.regularizationReviewSchema), controller.reviewRegularization);
    // Manual Attendance Entry (HR Admin / Super Admin)
    router.post('/manual', authMiddleware, (0, auth_1.requirePermission)('attendance.approve_all'), (0, validation_1.validateRequest)(attendanceValidators_1.manualEntrySchema), controller.createManualEntry);
    // Leaves management
    router.get('/leaves', authMiddleware, (0, auth_1.requirePermission)('leave.apply_self', 'leave.read_team', 'leave.read_all'), controller.listLeaves);
    router.get('/leaves/balances', authMiddleware, (0, auth_1.requirePermission)('leave.apply_self', 'leave.read_team', 'leave.read_all'), controller.listBalances);
    router.post('/leaves/apply', authMiddleware, (0, auth_1.requirePermission)('leave.apply_self'), (0, validation_1.validateRequest)(attendanceValidators_1.applyLeaveSchema), controller.applyLeave);
    router.put('/leaves/:id/review', authMiddleware, (0, auth_1.requirePermission)('leave.approve_team', 'leave.approve_all'), (0, validation_1.validateRequest)(attendanceValidators_1.reviewLeaveSchema), controller.reviewLeave);
    router.post('/leaves/:id/cancel', authMiddleware, (0, auth_1.requirePermission)('leave.apply_self', 'leave.approve_all'), (0, validation_1.validateRequest)(attendanceValidators_1.cancelLeaveSchema), controller.cancelLeave);
    // Leave Types configuration
    router.get('/leave-types', authMiddleware, (0, auth_1.requirePermission)('leave.apply_self', 'leave.read_team', 'leave.read_all'), controller.listLeaveTypes);
    router.post('/leave-types', authMiddleware, (0, auth_1.requirePermission)('leave.policies.manage'), (0, validation_1.validateRequest)(attendanceValidators_1.createLeaveTypeSchema), controller.createLeaveType);
    router.put('/leave-types/:id', authMiddleware, (0, auth_1.requirePermission)('leave.policies.manage'), (0, validation_1.validateRequest)(attendanceValidators_1.updateLeaveTypeSchema), controller.updateLeaveType);
    // Holiday calendar management
    router.get('/holidays', authMiddleware, (0, auth_1.requirePermission)('attendance.punch_self', 'leave.apply_self', 'leave.read_all'), controller.listHolidays);
    router.post('/holidays', authMiddleware, (0, auth_1.requirePermission)('leave.policies.manage'), (0, validation_1.validateRequest)(attendanceValidators_1.createHolidaySchema), controller.createHoliday);
    router.delete('/holidays/:id', authMiddleware, (0, auth_1.requirePermission)('leave.policies.manage'), controller.deleteHoliday);
    // Internal Payroll Summary endpoint
    router.get('/internal/payroll-summary', authMiddleware, controller.getPayrollSummary);
    return router;
}
