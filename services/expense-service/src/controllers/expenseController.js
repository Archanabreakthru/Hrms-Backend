"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class ExpenseController {
    expenseService;
    constructor(expenseService) {
        this.expenseService = expenseService;
    }
    // ==========================================
    // Categories
    // ==========================================
    listCategories = async (req, res, next) => {
        try {
            const activeOnly = req.query.activeOnly !== 'false';
            const categories = await this.expenseService.listCategories(activeOnly);
            (0, apiResponse_1.apiSuccess)(res, categories, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getCategoryById = async (req, res, next) => {
        try {
            const category = await this.expenseService.getCategoryById(req.params.id);
            (0, apiResponse_1.apiSuccess)(res, category, 200);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // Claims
    // ==========================================
    listClaims = async (req, res, next) => {
        try {
            const filter = {
                status: req.query.status,
                categoryId: req.query.categoryId,
                fromDate: req.query.fromDate,
                toDate: req.query.toDate,
                employeeId: req.query.employeeId,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
            };
            const claims = await this.expenseService.listClaims(filter, req.user);
            (0, apiResponse_1.apiSuccess)(res, claims, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getClaimById = async (req, res, next) => {
        try {
            const claim = await this.expenseService.getClaimById(req.params.id, req.user);
            (0, apiResponse_1.apiSuccess)(res, claim, 200);
        }
        catch (err) {
            next(err);
        }
    };
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
    reimburseClaim = async (req, res, next) => {
        try {
            const { reimbursementReference, remarks } = req.body;
            const claim = await this.expenseService.reimburseClaim(req.params.id, reimbursementReference, remarks, req.user);
            (0, apiResponse_1.apiSuccess)(res, claim, 200);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // Advances / Petty Cash
    // ==========================================
    listAdvances = async (req, res, next) => {
        try {
            const filter = {
                status: req.query.status,
                advanceType: req.query.advanceType,
                fromDate: req.query.fromDate,
                toDate: req.query.toDate,
                employeeId: req.query.employeeId,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
            };
            const advances = await this.expenseService.listAdvances(filter, req.user);
            (0, apiResponse_1.apiSuccess)(res, advances, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getAdvanceById = async (req, res, next) => {
        try {
            const adv = await this.expenseService.getAdvanceById(req.params.id, req.user);
            (0, apiResponse_1.apiSuccess)(res, adv, 200);
        }
        catch (err) {
            next(err);
        }
    };
    requestAdvance = async (req, res, next) => {
        try {
            const adv = await this.expenseService.requestAdvance(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, adv, 201);
        }
        catch (err) {
            next(err);
        }
    };
    reviewAdvance = async (req, res, next) => {
        try {
            const { decision, approvedAmount, remarks } = req.body;
            const adv = await this.expenseService.reviewAdvance(req.params.id, decision, approvedAmount, remarks, req.user);
            (0, apiResponse_1.apiSuccess)(res, adv, 200);
        }
        catch (err) {
            next(err);
        }
    };
    disburseAdvance = async (req, res, next) => {
        try {
            const { paymentReference } = req.body;
            const adv = await this.expenseService.disburseAdvance(req.params.id, paymentReference, req.user);
            (0, apiResponse_1.apiSuccess)(res, adv, 200);
        }
        catch (err) {
            next(err);
        }
    };
    settleAdvance = async (req, res, next) => {
        try {
            const { actualExpense, settlementNote } = req.body;
            const adv = await this.expenseService.settleAdvance(req.params.id, actualExpense, settlementNote, req.user);
            (0, apiResponse_1.apiSuccess)(res, adv, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.ExpenseController = ExpenseController;
