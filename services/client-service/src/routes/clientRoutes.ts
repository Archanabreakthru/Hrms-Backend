import { Router } from 'express';
import { ClientController } from '../controllers/clientController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import {
  createClientSchema,
  updateClientSchema,
  createSupervisorSchema,
  updateSupervisorSchema,
  createDeploymentSchema,
  updateDeploymentSchema,
  verifyAttendanceSchema,
  hrApproveSchema,
} from '../validators/clientValidators';
import { config } from '../config/env';

export function createClientRouter(controller: ClientController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // All endpoints require verified JWT authentication
  router.use(authMiddleware);

  // ==========================================
  // Client Organizations
  // ==========================================
  router.get(
    '/',
    requirePermission('client.organizations.manage'),
    controller.listClients
  );

  router.post(
    '/',
    requirePermission('client.organizations.manage'),
    validateRequest(createClientSchema),
    controller.createClient
  );

  // ==========================================
  // Client Supervisors
  // ==========================================
  router.get(
    '/supervisors',
    requirePermission('client.supervisors.manage'),
    controller.listSupervisors
  );

  router.post(
    '/supervisors',
    requirePermission('client.supervisors.manage'),
    validateRequest(createSupervisorSchema),
    controller.createSupervisor
  );

  router.put(
    '/supervisors/:id',
    requirePermission('client.supervisors.manage'),
    validateRequest(updateSupervisorSchema),
    controller.updateSupervisor
  );

  // ==========================================
  // Employee Deployments
  // ==========================================
  router.get(
    '/deployments',
    requirePermission('client.deployments.manage', 'client.deployments.read_assigned'),
    controller.listDeployments
  );

  router.post(
    '/deployments',
    requirePermission('client.deployments.manage'),
    validateRequest(createDeploymentSchema),
    controller.createDeployment
  );

  router.put(
    '/deployments/:id',
    requirePermission('client.deployments.manage'),
    validateRequest(updateDeploymentSchema),
    controller.updateDeployment
  );

  // ==========================================
  // Client Attendance Verifications
  // ==========================================
  router.get(
    '/verifications',
    requirePermission('client.attendance.verify_deployed', 'client.verification.hr_resolve'),
    controller.listVerifications
  );

  router.put(
    '/verifications/:id/verify',
    requirePermission('client.attendance.verify_deployed'),
    validateRequest(verifyAttendanceSchema),
    controller.supervisorVerify
  );

  router.put(
    '/verifications/:id/hr-approve',
    requirePermission('client.verification.hr_resolve'),
    validateRequest(hrApproveSchema),
    controller.hrResolveAndApprove
  );

  // ==========================================
  // Specific Organization Lookups by ID
  // (Placed after specific sub-resource paths to prevent collision)
  // ==========================================
  router.get(
    '/:id',
    requirePermission('client.organizations.manage'),
    controller.getClientById
  );

  router.put(
    '/:id',
    requirePermission('client.organizations.manage'),
    validateRequest(updateClientSchema),
    controller.updateClient
  );

  // Internal Endpoint for Payroll Service
  router.get('/internal/payroll-verification', controller.getPayrollVerificationSummary);

  return router;
}
