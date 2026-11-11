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
} from '../validators/attendanceValidators';
import { config } from '../config/env';

export function createAttendanceRouter(controller: AttendanceController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Punch clock (Self or HR Admin)
  router.post(
    '/punch',
    authMiddleware,
    requirePermission('attendance.punch_self'),
    validateRequest(punchClockSchema),
    controller.punch
  );

  // Attendance Regularization
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

  // Leaves
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

  // Internal Payroll Summary endpoint
  router.get('/internal/payroll-summary', authMiddleware, controller.getPayrollSummary);

  return router;
}

