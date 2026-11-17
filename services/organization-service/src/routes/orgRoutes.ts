import { Router } from 'express';
import { OrganizationController } from '../controllers/orgController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import {
  updateCompanyProfileSchema,
  updateStatutoryConfigSchema,
  createBranchSchema,
  updateBranchSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createDesignationSchema,
  updateDesignationSchema,
  toggleStatusSchema,
} from '../validators/orgValidators';
import { config } from '../config/env';

export function createOrgRouter(orgController: OrganizationController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Profile
  router.get('/profile', authMiddleware, requirePermission('org.profile.read'), orgController.getProfile);
  router.put(
    '/profile',
    authMiddleware,
    requirePermission('org.profile.manage'),
    validateRequest(updateCompanyProfileSchema),
    orgController.updateProfile
  );

  // Statutory Configuration
  router.get('/statutory', authMiddleware, requirePermission('org.profile.read'), orgController.getStatutoryConfig);
  router.put(
    '/statutory',
    authMiddleware,
    requirePermission('org.profile.manage'),
    validateRequest(updateStatutoryConfigSchema),
    orgController.updateStatutoryConfig
  );

  // Branches
  router.get('/branches', authMiddleware, requirePermission('org.profile.read'), orgController.getBranches);
  router.post(
    '/branches',
    authMiddleware,
    requirePermission('org.branches.manage'),
    validateRequest(createBranchSchema),
    orgController.createBranch
  );
  router.put(
    '/branches/:id',
    authMiddleware,
    requirePermission('org.branches.manage'),
    validateRequest(updateBranchSchema),
    orgController.updateBranch
  );
  router.patch(
    '/branches/:id/status',
    authMiddleware,
    requirePermission('org.branches.manage'),
    validateRequest(toggleStatusSchema),
    orgController.toggleBranchStatus
  );

  // Departments
  router.get('/departments', authMiddleware, requirePermission('org.profile.read'), orgController.getDepartments);
  router.post(
    '/departments',
    authMiddleware,
    requirePermission('org.departments.manage'),
    validateRequest(createDepartmentSchema),
    orgController.createDepartment
  );
  router.put(
    '/departments/:id',
    authMiddleware,
    requirePermission('org.departments.manage'),
    validateRequest(updateDepartmentSchema),
    orgController.updateDepartment
  );
  router.patch(
    '/departments/:id/status',
    authMiddleware,
    requirePermission('org.departments.manage'),
    validateRequest(toggleStatusSchema),
    orgController.toggleDepartmentStatus
  );

  // Designations
  router.get('/designations', authMiddleware, requirePermission('org.profile.read'), orgController.getDesignations);
  router.post(
    '/designations',
    authMiddleware,
    requirePermission('org.designations.manage'),
    validateRequest(createDesignationSchema),
    orgController.createDesignation
  );
  router.put(
    '/designations/:id',
    authMiddleware,
    requirePermission('org.designations.manage'),
    validateRequest(updateDesignationSchema),
    orgController.updateDesignation
  );
  router.patch(
    '/designations/:id/status',
    authMiddleware,
    requirePermission('org.designations.manage'),
    validateRequest(toggleStatusSchema),
    orgController.toggleDesignationStatus
  );

  // Internal Designation Code Derivation for Employee Service ID Generation
  router.get('/designations/derive-code', authMiddleware, orgController.getDesignationCode);

  return router;
}

