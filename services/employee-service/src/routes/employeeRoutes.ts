import { Router } from 'express';
import { EmployeeController } from '../controllers/employeeController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import {
  draftEmployeeSchema,
  enrollEmployeeSchema,
  updatePersonalSchema,
  updateEmploymentSchema,
  updateReportingSchema,
  updateSalaryBankSchema,
} from '../validators/employeeValidators';
import { config } from '../config/env';

export function createEmployeeRouter(employeeController: EmployeeController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Listing (Scope-aware filtering)
  router.get('/', authMiddleware, requirePermission('employee.directory.read_basic'), employeeController.list);

  // Single Employee Profile (Redacts sensitive fields based on caller scope)
  router.get('/:id', authMiddleware, requirePermission('employee.directory.read_basic'), employeeController.getById);

  // Draft Creation (Partial info allowed)
  router.post(
    '/draft',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    validateRequest(draftEmployeeSchema),
    employeeController.createDraft
  );

  // Complete Enrollment (Mandatory fields enforced)
  router.post(
    '/enroll',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    validateRequest(enrollEmployeeSchema),
    employeeController.enroll
  );

  // Update Personal Details (Self or HR Admin)
  router.put(
    '/:id/personal',
    authMiddleware,
    requirePermission('employee.profile.update_self', 'employee.profile.edit_personal'),
    validateRequest(updatePersonalSchema),
    employeeController.updatePersonal
  );

  // Update Employment Details (HR Admin only)
  router.put(
    '/:id/employment',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    validateRequest(updateEmploymentSchema),
    employeeController.updateEmployment
  );

  // Update Reporting Hierarchy (HR Admin or Senior Manager)
  router.put(
    '/:id/reporting',
    authMiddleware,
    requirePermission('employee.profile.edit_reporting'),
    validateRequest(updateReportingSchema),
    employeeController.updateReporting
  );

  // Update Salary & Bank Details (Strictly HR Admin; Self & Managers prohibited)
  router.put(
    '/:id/salary-bank',
    authMiddleware,
    requirePermission('employee.salary.edit', 'employee.bank_details.edit'),
    validateRequest(updateSalaryBankSchema),
    employeeController.updateSalaryBank
  );

  return router;
}

