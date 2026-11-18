"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class ClientController {
    clientService;
    constructor(clientService) {
        this.clientService = clientService;
    }
    // ==========================================
    // Client Organizations
    // ==========================================
    listClients = async (req, res, next) => {
        try {
            const { status, search } = req.query;
            const clients = await this.clientService.listClients(status, search);
            (0, apiResponse_1.apiSuccess)(res, clients, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getClientById = async (req, res, next) => {
        try {
            const client = await this.clientService.getClientById(req.params.id);
            (0, apiResponse_1.apiSuccess)(res, client, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createClient = async (req, res, next) => {
        try {
            const created = await this.clientService.createClient(req.body);
            (0, apiResponse_1.apiSuccess)(res, created, 201);
        }
        catch (err) {
            next(err);
        }
    };
    updateClient = async (req, res, next) => {
        try {
            const updated = await this.clientService.updateClient(req.params.id, req.body);
            (0, apiResponse_1.apiSuccess)(res, updated, 200);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // Client Supervisors
    // ==========================================
    listSupervisors = async (req, res, next) => {
        try {
            const { clientId } = req.query;
            const supervisors = await this.clientService.listSupervisors(clientId, req.user);
            (0, apiResponse_1.apiSuccess)(res, supervisors, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createSupervisor = async (req, res, next) => {
        try {
            const created = await this.clientService.createSupervisor(req.body);
            (0, apiResponse_1.apiSuccess)(res, created, 201);
        }
        catch (err) {
            next(err);
        }
    };
    updateSupervisor = async (req, res, next) => {
        try {
            const updated = await this.clientService.updateSupervisor(req.params.id, req.body);
            (0, apiResponse_1.apiSuccess)(res, updated, 200);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // Employee Deployments
    // ==========================================
    listDeployments = async (req, res, next) => {
        try {
            const { clientId, employeeId, status } = req.query;
            const deployments = await this.clientService.listDeployments({ clientId, employeeId, status }, req.user);
            (0, apiResponse_1.apiSuccess)(res, deployments, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createDeployment = async (req, res, next) => {
        try {
            const created = await this.clientService.createDeployment(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, created, 201);
        }
        catch (err) {
            next(err);
        }
    };
    updateDeployment = async (req, res, next) => {
        try {
            const updated = await this.clientService.updateDeployment(req.params.id, req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, updated, 200);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // Attendance Verifications
    // ==========================================
    listVerifications = async (req, res, next) => {
        try {
            const { clientId, employeeId, periodKey, status } = req.query;
            const verifications = await this.clientService.listVerifications({ clientId, employeeId, periodKey, status }, req.user);
            (0, apiResponse_1.apiSuccess)(res, verifications, 200);
        }
        catch (err) {
            next(err);
        }
    };
    supervisorVerify = async (req, res, next) => {
        try {
            const { decision, remarks } = req.body;
            const verif = await this.clientService.supervisorVerify(req.params.id, decision, remarks, req.user);
            (0, apiResponse_1.apiSuccess)(res, verif, 200);
        }
        catch (err) {
            next(err);
        }
    };
    hrResolveAndApprove = async (req, res, next) => {
        try {
            const { decision, hrComments } = req.body;
            const verif = await this.clientService.hrResolveAndApprove(req.params.id, decision, hrComments, req.user);
            (0, apiResponse_1.apiSuccess)(res, verif, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getPayrollVerificationSummary = async (req, res, next) => {
        try {
            const { employeeId, periodKey } = req.query;
            const summary = await this.clientService.getVerifiedHoursAndAllowancesForPayroll(employeeId, periodKey);
            (0, apiResponse_1.apiSuccess)(res, summary, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.ClientController = ClientController;
