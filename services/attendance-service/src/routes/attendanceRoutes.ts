import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import {
  punchClockSchema,
  regularizationSchema,
  regularizationReviewSchema,
  applyLeaveSchema,
  reviewLeaveSchema,
  createShiftSchema,
  manualEntrySchema,
  createHolidaySchema,
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  cancelLeaveSchema,
} from '../validators/attendanceValidators';
import { config } from '../config/env';

export function createAttendanceRouter(controller: AttendanceController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // List attendance records (Filtered by date, employee; RBAC scoped)
  router.get(
    '/records',
    authMiddleware,
    requirePermission('attendance.punch_self', 'attendance.read_team', 'attendance.read_all'),
    controller.listRecords
  );

  // Today's attendance status for current employee
  router.get(
    '/today',
    authMiddleware,
    requirePermission('attendance.punch_self'),
    controller.getToday
  );

  // Punch clock (Self or HR Admin)
  router.post(
    '/punch',
    authMiddleware,
    requirePermission('attendance.punch_self'),
    validateRequest(punchClockSchema),
    controller.punch
  );

  // Shifts management
  router.get(
    '/shifts',
    authMiddleware,
    requirePermission('attendance.punch_self', 'attendance.read_team', 'attendance.read_all'),
    controller.listShifts
  );

  router.post(
    '/shifts',
    authMiddleware,
    requirePermission('shifts.roster.manage'),
    validateRequest(createShiftSchema),
    controller.createShift
  );

  // Shift Schedules / Roster management
  router.get(
    '/schedules',
    authMiddleware,
    requirePermission('attendance.punch_self', 'attendance.read_team', 'attendance.read_all', 'shifts.roster.manage'),
    controller.listShiftSchedules
  );

  router.post(
    '/schedules',
    authMiddleware,
    requirePermission('shifts.roster.manage'),
    controller.createShiftSchedule
  );

  // Attendance Regularization listing & creation
  router.get(
    '/regularizations',
    authMiddleware,
    requirePermission('attendance.regularize_self', 'attendance.approve_team', 'attendance.approve_all'),
    controller.listRegularizations
  );

  router.post(
    '/regularize',
    authMiddleware,
    requirePermission('attendance.regularize_self'),
    validateRequest(regularizationSchema),
    controller.requestRegularization
  );

  router.put(
    '/regularize/:id/review',
    authMiddleware,
    requirePermission('attendance.approve_team', 'attendance.approve_all'),
    validateRequest(regularizationReviewSchema),
    controller.reviewRegularization
  );

  // Manual Attendance Entry (HR Admin / Super Admin)
  router.post(
    '/manual',
    authMiddleware,
    requirePermission('attendance.approve_all'),
    validateRequest(manualEntrySchema),
    controller.createManualEntry
  );

  // Leaves management
  router.get(
    '/leaves',
    authMiddleware,
    requirePermission('leave.apply_self', 'leave.read_team', 'leave.read_all'),
    controller.listLeaves
  );

  router.get(
    '/leaves/balances',
    authMiddleware,
    requirePermission('leave.apply_self', 'leave.read_team', 'leave.read_all'),
    controller.listBalances
  );

  router.post(
    '/leaves/apply',
    authMiddleware,
    requirePermission('leave.apply_self'),
    validateRequest(applyLeaveSchema),
    controller.applyLeave
  );

  router.put(
    '/leaves/:id/review',
    authMiddleware,
    requirePermission('leave.approve_team', 'leave.approve_all'),
    validateRequest(reviewLeaveSchema),
    controller.reviewLeave
  );

  router.post(
    '/leaves/:id/cancel',
    authMiddleware,
    requirePermission('leave.apply_self', 'leave.approve_all'),
    validateRequest(cancelLeaveSchema),
    controller.cancelLeave
  );

  // Leave Types configuration
  router.get(
    '/leave-types',
    authMiddleware,
    requirePermission('leave.apply_self', 'leave.read_team', 'leave.read_all'),
    controller.listLeaveTypes
  );

  router.post(
    '/leave-types',
    authMiddleware,
    requirePermission('leave.policies.manage'),
    validateRequest(createLeaveTypeSchema),
    controller.createLeaveType
  );

  router.put(
    '/leave-types/:id',
    authMiddleware,
    requirePermission('leave.policies.manage'),
    validateRequest(updateLeaveTypeSchema),
    controller.updateLeaveType
  );

  // Holiday calendar management
  router.get(
    '/holidays',
    authMiddleware,
    requirePermission('attendance.punch_self', 'leave.apply_self', 'leave.read_all'),
    controller.listHolidays
  );

  router.post(
    '/holidays',
    authMiddleware,
    requirePermission('leave.policies.manage'),
    validateRequest(createHolidaySchema),
    controller.createHoliday
  );

  router.delete(
    '/holidays/:id',
    authMiddleware,
    requirePermission('leave.policies.manage'),
    controller.deleteHoliday
  );

  // Internal Payroll Summary endpoint
  router.get('/internal/payroll-summary', authMiddleware, controller.getPayrollSummary);

  return router;
}

