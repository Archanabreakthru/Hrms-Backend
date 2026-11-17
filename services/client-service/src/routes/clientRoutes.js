"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientRouter = createClientRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const clientValidators_1 = require("../validators/clientValidators");
const env_1 = require("../config/env");
function createClientRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // All endpoints require verified JWT authentication
    router.use(authMiddleware);
    // ==========================================
    // Client Organizations
    // ==========================================
    router.get('/', (0, auth_1.requirePermission)('client.organizations.manage'), controller.listClients);
    router.post('/', (0, auth_1.requirePermission)('client.organizations.manage'), (0, validation_1.validateRequest)(clientValidators_1.createClientSchema), controller.createClient);
    // ==========================================
    // Client Supervisors
    // ==========================================
    router.get('/supervisors', (0, auth_1.requirePermission)('client.supervisors.manage'), controller.listSupervisors);
    router.post('/supervisors', (0, auth_1.requirePermission)('client.supervisors.manage'), (0, validation_1.validateRequest)(clientValidators_1.createSupervisorSchema), controller.createSupervisor);
    router.put('/supervisors/:id', (0, auth_1.requirePermission)('client.supervisors.manage'), (0, validation_1.validateRequest)(clientValidators_1.updateSupervisorSchema), controller.updateSupervisor);
    // ==========================================
    // Employee Deployments
    // ==========================================
    router.get('/deployments', (0, auth_1.requirePermission)('client.deployments.manage', 'client.deployments.read_assigned'), controller.listDeployments);
    router.post('/deployments', (0, auth_1.requirePermission)('client.deployments.manage'), (0, validation_1.validateRequest)(clientValidators_1.createDeploymentSchema), controller.createDeployment);
    router.put('/deployments/:id', (0, auth_1.requirePermission)('client.deployments.manage'), (0, validation_1.validateRequest)(clientValidators_1.updateDeploymentSchema), controller.updateDeployment);
    // ==========================================
    // Client Attendance Verifications
    // ==========================================
    router.get('/verifications', (0, auth_1.requirePermission)('client.attendance.verify_deployed', 'client.verification.hr_resolve'), controller.listVerifications);
    router.put('/verifications/:id/verify', (0, auth_1.requirePermission)('client.attendance.verify_deployed'), (0, validation_1.validateRequest)(clientValidators_1.verifyAttendanceSchema), controller.supervisorVerify);
    router.put('/verifications/:id/hr-approve', (0, auth_1.requirePermission)('client.verification.hr_resolve'), (0, validation_1.validateRequest)(clientValidators_1.hrApproveSchema), controller.hrResolveAndApprove);
    // ==========================================
    // Specific Organization Lookups by ID
    // (Placed after specific sub-resource paths to prevent collision)
    // ==========================================
    router.get('/:id', (0, auth_1.requirePermission)('client.organizations.manage'), controller.getClientById);
    router.put('/:id', (0, auth_1.requirePermission)('client.organizations.manage'), (0, validation_1.validateRequest)(clientValidators_1.updateClientSchema), controller.updateClient);
    // Internal Endpoint for Payroll Service
    router.get('/internal/payroll-verification', controller.getPayrollVerificationSummary);
    return router;
}
