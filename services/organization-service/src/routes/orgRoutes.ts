import { Router } from 'express';
import { OrganizationController } from '../controllers/orgController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import {
  updateCompanyProfileSchema,
  createBranchSchema,
  createDepartmentSchema,
  createDesignationSchema,
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

  // Branches
  router.get('/branches', authMiddleware, requirePermission('org.profile.read'), orgController.getBranches);
  router.post(
    '/branches',
    authMiddleware,
    requirePermission('org.branches.manage'),
    validateRequest(createBranchSchema),
    orgController.createBranch
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

  // Designations
  router.get('/designations', authMiddleware, requirePermission('org.profile.read'), orgController.getDesignations);
  router.post(
    '/designations',
    authMiddleware,
    requirePermission('org.designations.manage'),
    validateRequest(createDesignationSchema),
    orgController.createDesignation
  );

  // Internal Designation Code Derivation for Employee Service ID Generation
  router.get('/designations/derive-code', authMiddleware, orgController.getDesignationCode);

  return router;
}

