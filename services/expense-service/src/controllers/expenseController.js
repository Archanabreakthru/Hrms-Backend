"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class ExpenseController {
    expenseService;
    constructor(expenseService) {
        this.expenseService = expenseService;
    }
    submitClaim = async (req, res, next) => {
        try {
            const claim = await this.expenseService.submitClaim(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, claim, 201);
        }
        catch (err) {
            next(err);
        }
    };
    managerReview = async (req, res, next) => {
        try {
            const { decision, remarks } = req.body;
            const claim = await this.expenseService.managerReview(req.params.id, decision, remarks, req.user);
            (0, apiResponse_1.apiSuccess)(res, claim, 200);
        }
        catch (err) {
            next(err);
        }
    };
    hrFinalApprove = async (req, res, next) => {
        try {
            const { decision, remarks } = req.body;
            const claim = await this.expenseService.hrFinalApprove(req.params.id, decision, remarks, req.user);
            (0, apiResponse_1.apiSuccess)(res, claim, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.ExpenseController = ExpenseController;
