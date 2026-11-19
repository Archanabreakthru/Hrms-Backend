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

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.employeeService.deleteEmployee(req.params.id, req.user!);
      apiSuccess(res, result, 200);
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
        search: req.query.search as string,
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

  getServiceRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await this.employeeService.getServiceRecords(req.params.id, req.user!);
      apiSuccess(res, records, 200);
    } catch (err) {
      next(err);
    }
  };

  createServiceRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.employeeService.createServiceRecord(req.params.id, req.body, req.user!);
      apiSuccess(res, record, 201);
    } catch (err) {
      next(err);
    }
  };

  updateServiceRecordStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.employeeService.updateServiceRecordStatus(
        req.params.id,
        req.params.recordId,
        req.body.approvalStatus,
        req.user!
      );
      apiSuccess(res, record, 200);
    } catch (err) {
      next(err);
    }
  };

  getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const docs = await this.employeeService.getDocuments(req.params.id, req.user!);
      apiSuccess(res, docs, 200);
    } catch (err) {
      next(err);
    }
  };

  uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doc = await this.employeeService.uploadDocument(req.params.id, req.body, req.user!);
      apiSuccess(res, doc, 201);
    } catch (err) {
      next(err);
    }
  };

  deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.employeeService.deleteDocument(req.params.id, req.params.docId, req.user!);
      apiSuccess(res, { deleted: true }, 200);
    } catch (err) {
      next(err);
    }
  };

  updateDocumentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doc = await this.employeeService.updateDocumentStatus(
        req.params.id,
        req.params.docId,
        req.body,
        req.user!
      );
      apiSuccess(res, doc, 200);
    } catch (err) {
      next(err);
    }
  };
}

