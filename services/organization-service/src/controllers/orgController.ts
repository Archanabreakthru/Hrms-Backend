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

  getDesignationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const designationId = req.query.designationId as string;
      const code = await this.orgService.deriveDesignationCode(designationId);
      apiSuccess(res, { code }, 200);
    } catch (err) {
      next(err);
    }
  };
}

