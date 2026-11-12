"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrgRouter = createOrgRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const orgValidators_1 = require("../validators/orgValidators");
const env_1 = require("../config/env");
function createOrgRouter(orgController) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // Profile
    router.get('/profile', authMiddleware, (0, auth_1.requirePermission)('org.profile.read'), orgController.getProfile);
    router.put('/profile', authMiddleware, (0, auth_1.requirePermission)('org.profile.manage'), (0, validation_1.validateRequest)(orgValidators_1.updateCompanyProfileSchema), orgController.updateProfile);
    // Branches
    router.get('/branches', authMiddleware, (0, auth_1.requirePermission)('org.profile.read'), orgController.getBranches);
    router.post('/branches', authMiddleware, (0, auth_1.requirePermission)('org.branches.manage'), (0, validation_1.validateRequest)(orgValidators_1.createBranchSchema), orgController.createBranch);
    // Departments
    router.get('/departments', authMiddleware, (0, auth_1.requirePermission)('org.profile.read'), orgController.getDepartments);
    router.post('/departments', authMiddleware, (0, auth_1.requirePermission)('org.departments.manage'), (0, validation_1.validateRequest)(orgValidators_1.createDepartmentSchema), orgController.createDepartment);
    // Designations
    router.get('/designations', authMiddleware, (0, auth_1.requirePermission)('org.profile.read'), orgController.getDesignations);
    router.post('/designations', authMiddleware, (0, auth_1.requirePermission)('org.designations.manage'), (0, validation_1.validateRequest)(orgValidators_1.createDesignationSchema), orgController.createDesignation);
    // Internal Designation Code Derivation for Employee Service ID Generation
    router.get('/designations/derive-code', authMiddleware, orgController.getDesignationCode);
    return router;
}
