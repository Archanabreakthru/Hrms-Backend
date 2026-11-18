import { Request, Response, NextFunction } from 'express';
import { PayrollService } from '../services/payrollService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  runPayroll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { month, year, employeeIds } = req.body;
      const targetEmployees = employeeIds || ['EMP-SWE-0001'];
      const result = await this.payrollService.runPayroll(month, year, targetEmployees, req.user!);
      apiSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  listSalaryStructures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const structures = await this.payrollService.listSalaryStructures();
      apiSuccess(res, structures, 200);
    } catch (err) {
      next(err);
    }
  };

  createSalaryStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const saved = await this.payrollService.createSalaryStructure(req.body);
      apiSuccess(res, saved, 201);
    } catch (err) {
      next(err);
    }
  };

  deleteSalaryStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.payrollService.deleteSalaryStructure(id);
      apiSuccess(res, { deleted: true, id }, 200);
    } catch (err) {
      next(err);
    }
  };
}

