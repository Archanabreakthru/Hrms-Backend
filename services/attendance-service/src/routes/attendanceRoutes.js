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
    // Punch clock (Self or HR Admin)
    router.post('/punch', authMiddleware, (0, auth_1.requirePermission)('attendance.punch_self'), (0, validation_1.validateRequest)(attendanceValidators_1.punchClockSchema), controller.punch);
    // Attendance Regularization
    router.post('/regularize', authMiddleware, (0, auth_1.requirePermission)('attendance.regularize_self'), (0, validation_1.validateRequest)(attendanceValidators_1.regularizationSchema), controller.requestRegularization);
    router.put('/regularize/:id/review', authMiddleware, (0, auth_1.requirePermission)('attendance.approve_team', 'attendance.approve_all'), (0, validation_1.validateRequest)(attendanceValidators_1.regularizationReviewSchema), controller.reviewRegularization);
    // Leaves
    router.post('/leaves/apply', authMiddleware, (0, auth_1.requirePermission)('leave.apply_self'), (0, validation_1.validateRequest)(attendanceValidators_1.applyLeaveSchema), controller.applyLeave);
    router.put('/leaves/:id/review', authMiddleware, (0, auth_1.requirePermission)('leave.approve_team', 'leave.approve_all'), (0, validation_1.validateRequest)(attendanceValidators_1.reviewLeaveSchema), controller.reviewLeave);
    // Internal Payroll Summary endpoint
    router.get('/internal/payroll-summary', authMiddleware, controller.getPayrollSummary);
    return router;
}
