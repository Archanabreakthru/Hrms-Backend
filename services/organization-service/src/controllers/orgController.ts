import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../services/orgService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.orgService.getCompanyProfile();
      apiSuccess(res, profile, 200);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.orgService.updateCompanyProfile(req.body);
      apiSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  };

  getStatutoryConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await this.orgService.getStatutoryConfig();
      apiSuccess(res, config, 200);
    } catch (err) {
      next(err);
    }
  };

  updateStatutoryConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.orgService.updateStatutoryConfig(req.body);
      apiSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  };

  getBranches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branches = await this.orgService.getBranches();
      apiSuccess(res, branches, 200);
    } catch (err) {
      next(err);
    }
  };

  createBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branch = await this.orgService.createBranch(req.body);
      apiSuccess(res, branch, 201);
    } catch (err) {
      next(err);
    }
  };

  updateBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branch = await this.orgService.updateBranch(req.params.id, req.body);
      apiSuccess(res, branch, 200);
    } catch (err) {
      next(err);
    }
  };

  toggleBranchStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branch = await this.orgService.toggleBranchStatus(req.params.id, req.body.isActive);
      apiSuccess(res, branch, 200);
    } catch (err) {
      next(err);
    }
  };

  getDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departments = await this.orgService.getDepartments();
      apiSuccess(res, departments, 200);
    } catch (err) {
      next(err);
    }
  };

  createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dept = await this.orgService.createDepartment(req.body);
      apiSuccess(res, dept, 201);
    } catch (err) {
      next(err);
    }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dept = await this.orgService.updateDepartment(req.params.id, req.body);
      apiSuccess(res, dept, 200);
    } catch (err) {
      next(err);
    }
  };

  toggleDepartmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dept = await this.orgService.toggleDepartmentStatus(req.params.id, req.body.isActive);
      apiSuccess(res, dept, 200);
    } catch (err) {
      next(err);
    }
  };

  getDesignations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const designations = await this.orgService.getDesignations();
      apiSuccess(res, designations, 200);
    } catch (err) {
      next(err);
    }
  };

  createDesignation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const desig = await this.orgService.createDesignation(req.body);
      apiSuccess(res, desig, 201);
    } catch (err) {
      next(err);
    }
  };

  updateDesignation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const desig = await this.orgService.updateDesignation(req.params.id, req.body);
      apiSuccess(res, desig, 200);
    } catch (err) {
      next(err);
    }
  };

  toggleDesignationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const desig = await this.orgService.toggleDesignationStatus(req.params.id, req.body.isActive);
      apiSuccess(res, desig, 200);
    } catch (err) {
      next(err);
    }
  };

  getDesignationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const designationId = req.query.designationId as string;
      const code = await this.orgService.deriveDesignationCode(designationId);
      apiSuccess(res, { code }, 200);
    } catch (err) {
      next(err);
    }
  };

  deleteBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.orgService.deleteBranch(req.params.id);
      apiSuccess(res, { deleted: true, id: req.params.id }, 200);
    } catch (err) {
      next(err);
    }
  };

  deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.orgService.deleteDepartment(req.params.id);
      apiSuccess(res, { deleted: true, id: req.params.id }, 200);
    } catch (err) {
      next(err);
    }
  };

  deleteDesignation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.orgService.deleteDesignation(req.params.id);
      apiSuccess(res, { deleted: true, id: req.params.id }, 200);
    } catch (err) {
      next(err);
    }
  };

  getDelegations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const delegations = await this.orgService.getDelegations();
      apiSuccess(res, delegations, 200);
    } catch (err) {
      next(err);
    }
  };

  createDelegation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const delegation = await this.orgService.createDelegation(req.body);
      apiSuccess(res, delegation, 201);
    } catch (err) {
      next(err);
    }
  };

  revokeDelegation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const revoked = await this.orgService.revokeDelegation(req.params.id, actorId);
      apiSuccess(res, revoked, 200);
    } catch (err) {
      next(err);
    }
  };
}

