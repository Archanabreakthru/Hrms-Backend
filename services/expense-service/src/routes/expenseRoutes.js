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
    // Submit Claim (Self)
    router.post('/claims', authMiddleware, (0, auth_1.requirePermission)('expenses.claim_self'), (0, validation_1.validateRequest)(expenseValidators_1.submitExpenseSchema), controller.submitClaim);
    // Manager Review
    router.put('/claims/:id/manager-review', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_team', 'expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.reviewExpenseSchema), controller.managerReview);
    // HR Final Approval
    router.put('/claims/:id/hr-approve', authMiddleware, (0, auth_1.requirePermission)('expenses.approve_all'), (0, validation_1.validateRequest)(expenseValidators_1.reviewExpenseSchema), controller.hrFinalApprove);
    return router;
}
