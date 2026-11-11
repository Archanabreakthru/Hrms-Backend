import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employeeService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  createDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.createDraft(req.body, req.user!);
      apiSuccess(res, employee, 201);
    } catch (err) {
      next(err);
    }
  };

  enroll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.enroll(req.body, req.user!);
      apiSuccess(res, employee, 201);
    } catch (err) {
      next(err);
    }
  };

  updatePersonal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.updatePersonal(req.params.id, req.body, req.user!);
      apiSuccess(res, employee, 200);
    } catch (err) {
      next(err);
    }
  };

  updateEmployment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.updateEmployment(req.params.id, req.body, req.user!);
      apiSuccess(res, employee, 200);
    } catch (err) {
      next(err);
    }
  };

  updateReporting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.updateReporting(req.params.id, req.body.reportingManagerId, req.user!);
      apiSuccess(res, employee, 200);
    } catch (err) {
      next(err);
    }
  };

  updateSalaryBank = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.updateSalaryBank(req.params.id, req.body, req.user!);
      apiSuccess(res, employee, 200);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.getById(req.params.id, req.user!);
      apiSuccess(res, employee, 200);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        departmentId: req.query.departmentId as string,
        branchId: req.query.branchId as string,
        status: req.query.status as string,
        profileStatus: req.query.profileStatus as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      const result = await this.employeeService.list(query, req.user!);
      apiSuccess(res, result.employees, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };
}

