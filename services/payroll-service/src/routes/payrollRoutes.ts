import { Router } from 'express';
import { PayrollController } from '../controllers/payrollController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import { runPayrollSchema } from '../validators/payrollValidators';
import { config } from '../config/env';

export function createPayrollRouter(controller: PayrollController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Process Payroll (Requires HR Admin / payroll.process permission)
  router.post(
    '/runs',
    authMiddleware,
    requirePermission('payroll.process', 'payroll.run.execute'),
    validateRequest(runPayrollSchema),
    controller.runPayroll
  );

  return router;
}

