"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class PayrollController {
    payrollService;
    constructor(payrollService) {
        this.payrollService = payrollService;
    }
    runPayroll = async (req, res, next) => {
        try {
            const { month, year, employeeIds } = req.body;
            const targetEmployees = employeeIds || ['EMP-SWE-0001'];
            const result = await this.payrollService.runPayroll(month, year, targetEmployees, req.user);
            (0, apiResponse_1.apiSuccess)(res, result, 201);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.PayrollController = PayrollController;
