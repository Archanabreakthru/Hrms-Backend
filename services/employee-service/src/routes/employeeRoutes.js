"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmployeeRouter = createEmployeeRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const employeeValidators_1 = require("../validators/employeeValidators");
const env_1 = require("../config/env");
function createEmployeeRouter(employeeController) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // Listing (Scope-aware filtering)
    router.get('/', authMiddleware, (0, auth_1.requirePermission)('employee.directory.read_basic'), employeeController.list);
    // Single Employee Profile (Redacts sensitive fields based on caller scope)
    router.get('/:id', authMiddleware, (0, auth_1.requirePermission)('employee.directory.read_basic'), employeeController.getById);
    // Draft Creation (Partial info allowed)
    router.post('/draft', authMiddleware, (0, auth_1.requirePermission)('employee.profile.edit_employment'), (0, validation_1.validateRequest)(employeeValidators_1.draftEmployeeSchema), employeeController.createDraft);
    // Complete Enrollment (Mandatory fields enforced)
    router.post('/enroll', authMiddleware, (0, auth_1.requirePermission)('employee.profile.edit_employment'), (0, validation_1.validateRequest)(employeeValidators_1.enrollEmployeeSchema), employeeController.enroll);
    // Update Personal Details (Self or HR Admin)
    router.put('/:id/personal', authMiddleware, (0, auth_1.requirePermission)('employee.profile.update_self', 'employee.profile.edit_personal'), (0, validation_1.validateRequest)(employeeValidators_1.updatePersonalSchema), employeeController.updatePersonal);
    // Update Employment Details (HR Admin only)
    router.put('/:id/employment', authMiddleware, (0, auth_1.requirePermission)('employee.profile.edit_employment'), (0, validation_1.validateRequest)(employeeValidators_1.updateEmploymentSchema), employeeController.updateEmployment);
    // Update Reporting Hierarchy (HR Admin or Senior Manager)
    router.put('/:id/reporting', authMiddleware, (0, auth_1.requirePermission)('employee.profile.edit_reporting'), (0, validation_1.validateRequest)(employeeValidators_1.updateReportingSchema), employeeController.updateReporting);
    // Update Salary & Bank Details (Strictly HR Admin; Self & Managers prohibited)
    router.put('/:id/salary-bank', authMiddleware, (0, auth_1.requirePermission)('employee.salary.edit', 'employee.bank_details.edit'), (0, validation_1.validateRequest)(employeeValidators_1.updateSalaryBankSchema), employeeController.updateSalaryBank);
    return router;
}
