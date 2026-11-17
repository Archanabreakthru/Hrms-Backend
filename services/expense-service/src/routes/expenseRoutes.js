"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpenseRouter = createExpenseRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const expenseValidators_1 = require("../validators/expenseValidators");
const env_1 = require("../config/env");
function createExpenseRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // ==========================================
    // Categories (Read-only for all authenticated users)
    // ==========================================
    router.get('/categories', authMiddleware, controller.listCategories);
    router.get('/categories/:id', authMiddleware, controller.getCategoryById);
    // ==========================================
    // Expense Claims
    // ==========================================
    // List claims (Scoped server-side based on permission)
    router.get('/claims', authMiddleware, (0, auth_1.requirePermission)('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'), controller.listClaims);
    // Get single claim
    router.get('/claims/:id', authMiddleware, (0, auth_1.requirePermission)('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'), controller.getClaimById);
    // Submit claim (Self)
    router.post('/claims', authMiddleware, (0, auth_1.requirePermission)('expenses.claim_self'), (0, validation_1.validateRequest)(expenseValidators_1.submitExpenseSchema), controller.submitClaim);
    // Manager Review (Approve or Reject)
    router.put('/claims/:id/manager-review', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_team', 'expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.reviewExpenseSchema), controller.managerReview);
    // HR Final Approval (Approve or Reject)
    router.put('/claims/:id/hr-approve', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.reviewExpenseSchema), controller.hrFinalApprove);
    // Reimbursement Settlement (HR Admin only)
    router.put('/claims/:id/reimburse', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.reimburseExpenseSchema), controller.reimburseClaim);
    // ==========================================
    // Advances & Petty Cash
    // ==========================================
    // List advances (Scoped server-side based on permission)
    router.get('/advances', authMiddleware, (0, auth_1.requirePermission)('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'), controller.listAdvances);
    // Get single advance
    router.get('/advances/:id', authMiddleware, (0, auth_1.requirePermission)('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'), controller.getAdvanceById);
    // Request advance (Self)
    router.post('/advances', authMiddleware, (0, auth_1.requirePermission)('expenses.claim_self'), (0, validation_1.validateRequest)(expenseValidators_1.createAdvanceSchema), controller.requestAdvance);
    // Manager/HR Review advance (Approve or Reject)
    router.put('/advances/:id/review', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_team', 'expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.reviewAdvanceSchema), controller.reviewAdvance);
    // Disburse advance (HR Admin only)
    router.put('/advances/:id/disburse', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.disburseAdvanceSchema), controller.disburseAdvance);
    // Settle advance (HR Admin only)
    router.put('/advances/:id/settle', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.settleAdvanceSchema), controller.settleAdvance);
    return router;
}
