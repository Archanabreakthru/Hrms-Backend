import { Request, Response, NextFunction } from 'express';
import { ClientService } from '../services/clientService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class ClientController {
  constructor(private clientService: ClientService) {}

  // ==========================================
  // Client Organizations
  // ==========================================

  listClients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, search } = req.query as { status?: string; search?: string };
      const clients = await this.clientService.listClients(status, search);
      apiSuccess(res, clients, 200);
    } catch (err) {
      next(err);
    }
  };

  getClientById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const client = await this.clientService.getClientById(req.params.id);
      apiSuccess(res, client, 200);
    } catch (err) {
      next(err);
    }
  };

  createClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.clientService.createClient(req.body);
      apiSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  };

  updateClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.clientService.updateClient(req.params.id, req.body);
      apiSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // Client Supervisors
  // ==========================================

  listSupervisors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.query as { clientId?: string };
      const supervisors = await this.clientService.listSupervisors(clientId, req.user);
      apiSuccess(res, supervisors, 200);
    } catch (err) {
      next(err);
    }
  };

  createSupervisor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.clientService.createSupervisor(req.body);
      apiSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  };

  updateSupervisor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.clientService.updateSupervisor(req.params.id, req.body);
      apiSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // Employee Deployments
  // ==========================================

  listDeployments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, employeeId, status } = req.query as {
        clientId?: string;
        employeeId?: string;
        status?: string;
      };
      const deployments = await this.clientService.listDeployments(
        { clientId, employeeId, status },
        req.user!
      );
      apiSuccess(res, deployments, 200);
    } catch (err) {
      next(err);
    }
  };

  createDeployment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.clientService.createDeployment(req.body, req.user!);
      apiSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  };

  updateDeployment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.clientService.updateDeployment(req.params.id, req.body, req.user!);
      apiSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // Attendance Verifications
  // ==========================================

  listVerifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, employeeId, periodKey, status } = req.query as {
        clientId?: string;
        employeeId?: string;
        periodKey?: string;
        status?: string;
      };
      const verifications = await this.clientService.listVerifications(
        { clientId, employeeId, periodKey, status },
        req.user!
      );
      apiSuccess(res, verifications, 200);
    } catch (err) {
      next(err);
    }
  };

  supervisorVerify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, remarks } = req.body;
      const verif = await this.clientService.supervisorVerify(req.params.id, decision, remarks, req.user!);
      apiSuccess(res, verif, 200);
    } catch (err) {
      next(err);
    }
  };

  hrResolveAndApprove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { decision, hrComments } = req.body;
      const verif = await this.clientService.hrResolveAndApprove(req.params.id, decision, hrComments, req.user!);
      apiSuccess(res, verif, 200);
    } catch (err) {
      next(err);
    }
  };

  getPayrollVerificationSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, periodKey } = req.query as { employeeId: string; periodKey: string };
      const summary = await this.clientService.getVerifiedHoursAndAllowancesForPayroll(employeeId, periodKey);
      apiSuccess(res, summary, 200);
    } catch (err) {
      next(err);
    }
  };
}
