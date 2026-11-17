import { Router } from 'express';
import { PayrollController } from '../controllers/payrollController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import { runPayrollSchema, createSalaryStructureSchema } from '../validators/payrollValidators';
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

  // List Salary Structures
  router.get(
    '/structures',
    authMiddleware,
    controller.listSalaryStructures
  );

  // Create or Update Salary Structure
  router.post(
    '/structures',
    authMiddleware,
    requirePermission('payroll.process', 'payroll.structures.manage', 'org.profile.manage'),
    validateRequest(createSalaryStructureSchema),
    controller.createSalaryStructure
  );

  // Delete Salary Structure
  router.delete(
    '/structures/:id',
    authMiddleware,
    requirePermission('payroll.process', 'payroll.structures.manage', 'org.profile.manage'),
    controller.deleteSalaryStructure
  );

  return router;
}

