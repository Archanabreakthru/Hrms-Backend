import { Router } from 'express';
import { ClientController } from '../controllers/clientController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import { verifyAttendanceSchema, hrApproveSchema } from '../validators/clientValidators';
import { config } from '../config/env';

export function createClientRouter(controller: ClientController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Client Supervisor Attendance Verification
  router.put(
    '/verifications/:id/verify',
    authMiddleware,
    requirePermission('client.attendance.verify_deployed'),
    validateRequest(verifyAttendanceSchema),
    controller.supervisorVerify
  );

  // HR Dual-Approval & Dispute Resolution
  router.put(
    '/verifications/:id/hr-approve',
    authMiddleware,
    requirePermission('client.verification.hr_resolve'),
    validateRequest(hrApproveSchema),
    controller.hrResolveAndApprove
  );

  // Internal Endpoint for Payroll Service
  router.get('/internal/payroll-verification', authMiddleware, controller.getPayrollVerificationSummary);

  return router;
}

