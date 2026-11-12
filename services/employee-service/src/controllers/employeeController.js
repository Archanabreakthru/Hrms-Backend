"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class EmployeeController {
    employeeService;
    constructor(employeeService) {
        this.employeeService = employeeService;
    }
    createDraft = async (req, res, next) => {
        try {
            const employee = await this.employeeService.createDraft(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, employee, 201);
        }
        catch (err) {
            next(err);
        }
    };
    enroll = async (req, res, next) => {
        try {
            const employee = await this.employeeService.enroll(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, employee, 201);
        }
        catch (err) {
            next(err);
        }
    };
    updatePersonal = async (req, res, next) => {
        try {
            const employee = await this.employeeService.updatePersonal(req.params.id, req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, employee, 200);
        }
        catch (err) {
            next(err);
        }
    };
    updateEmployment = async (req, res, next) => {
        try {
            const employee = await this.employeeService.updateEmployment(req.params.id, req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, employee, 200);
        }
        catch (err) {
            next(err);
        }
    };
    updateReporting = async (req, res, next) => {
        try {
            const employee = await this.employeeService.updateReporting(req.params.id, req.body.reportingManagerId, req.user);
            (0, apiResponse_1.apiSuccess)(res, employee, 200);
        }
        catch (err) {
            next(err);
        }
    };
    updateSalaryBank = async (req, res, next) => {
        try {
            const employee = await this.employeeService.updateSalaryBank(req.params.id, req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, employee, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getById = async (req, res, next) => {
        try {
            const employee = await this.employeeService.getById(req.params.id, req.user);
            (0, apiResponse_1.apiSuccess)(res, employee, 200);
        }
        catch (err) {
            next(err);
        }
    };
    list = async (req, res, next) => {
        try {
            const query = {
                departmentId: req.query.departmentId,
                branchId: req.query.branchId,
                status: req.query.status,
                profileStatus: req.query.profileStatus,
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
            };
            const result = await this.employeeService.list(query, req.user);
            (0, apiResponse_1.apiSuccess)(res, result.employees, 200, {
                page: result.page,
                limit: result.limit,
                total: result.total,
            });
        }
        catch (err) {
            next(err);
        }
    };
}
exports.EmployeeController = EmployeeController;
