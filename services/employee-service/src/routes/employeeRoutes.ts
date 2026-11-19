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
  createServiceRecordSchema,
  updateServiceRecordStatusSchema,
  uploadDocumentSchema,
  updateDocumentStatusSchema,
} from '../validators/employeeValidators';
import { config } from '../config/env';

export function createEmployeeRouter(employeeController: EmployeeController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Listing (Scope-aware filtering)
  router.get('/', authMiddleware, requirePermission('employee.directory.read_basic'), employeeController.list);

  // Service Records for an Employee
  router.get(
    '/:id/service-records',
    authMiddleware,
    requirePermission('employee.directory.read_basic'),
    employeeController.getServiceRecords
  );

  router.post(
    '/:id/service-records',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    validateRequest(createServiceRecordSchema),
    employeeController.createServiceRecord
  );

  router.put(
    '/:id/service-records/:recordId/status',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    validateRequest(updateServiceRecordStatusSchema),
    employeeController.updateServiceRecordStatus
  );

  // Documents for an Employee
  router.get(
    '/:id/documents',
    authMiddleware,
    requirePermission('employee.directory.read_basic'),
    employeeController.getDocuments
  );

  router.post(
    '/:id/documents',
    authMiddleware,
    requirePermission('employee.profile.edit_employment', 'employee.profile.update_self', 'employee.profile.edit_personal'),
    validateRequest(uploadDocumentSchema),
    employeeController.uploadDocument
  );

  router.delete(
    '/:id/documents/:docId',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    employeeController.deleteDocument
  );

  router.put(
    '/:id/documents/:docId/status',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    validateRequest(updateDocumentStatusSchema),
    employeeController.updateDocumentStatus
  );

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

  // Delete Employee (HR Admin or Super Admin)
  router.delete(
    '/:id',
    authMiddleware,
    requirePermission('employee.profile.edit_employment'),
    employeeController.delete
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

