import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import {
  submitExpenseSchema,
  reviewExpenseSchema,
  reimburseExpenseSchema,
  createAdvanceSchema,
  reviewAdvanceSchema,
  disburseAdvanceSchema,
  settleAdvanceSchema,
} from '../validators/expenseValidators';
import { config } from '../config/env';

export function createExpenseRouter(controller: ExpenseController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // ==========================================
  // Categories (Read-only for all authenticated users)
  // ==========================================
  router.get('/categories', authMiddleware, controller.listCategories);
  router.get('/categories/:id', authMiddleware, controller.getCategoryById);

  // ==========================================
  // Expense Claims
  // ==========================================

  // List claims (Scoped server-side based on permission)
  router.get(
    '/claims',
    authMiddleware,
    requirePermission('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'),
    controller.listClaims
  );

  // Get single claim
  router.get(
    '/claims/:id',
    authMiddleware,
    requirePermission('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'),
    controller.getClaimById
  );

  // Submit claim (Self)
  router.post(
    '/claims',
    authMiddleware,
    requirePermission('expenses.claim_self'),
    validateRequest(submitExpenseSchema),
    controller.submitClaim
  );

  // Manager Review (Approve or Reject)
  router.put(
    '/claims/:id/manager-review',
    authMiddleware,
    requirePermission('expenses.approve_team', 'expenses.approve_all'),
    validateRequest(reviewExpenseSchema),
    controller.managerReview
  );

  // HR Final Approval (Approve or Reject)
  router.put(
    '/claims/:id/hr-approve',
    authMiddleware,
    requirePermission('expenses.approve_all'),
    validateRequest(reviewExpenseSchema),
    controller.hrFinalApprove
  );

  // Reimbursement Settlement (HR Admin only)
  router.put(
    '/claims/:id/reimburse',
    authMiddleware,
    requirePermission('expenses.approve_all'),
    validateRequest(reimburseExpenseSchema),
    controller.reimburseClaim
  );

  // ==========================================
  // Advances & Petty Cash
  // ==========================================

  // List advances (Scoped server-side based on permission)
  router.get(
    '/advances',
    authMiddleware,
    requirePermission('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'),
    controller.listAdvances
  );

  // Get single advance
  router.get(
    '/advances/:id',
    authMiddleware,
    requirePermission('expenses.claim_self', 'expenses.read_team', 'expenses.read_all'),
    controller.getAdvanceById
  );

  // Request advance (Self)
  router.post(
    '/advances',
    authMiddleware,
    requirePermission('expenses.claim_self'),
    validateRequest(createAdvanceSchema),
    controller.requestAdvance
  );

  // Manager/HR Review advance (Approve or Reject)
  router.put(
    '/advances/:id/review',
    authMiddleware,
    requirePermission('expenses.approve_team', 'expenses.approve_all'),
    validateRequest(reviewAdvanceSchema),
    controller.reviewAdvance
  );

  // Disburse advance (HR Admin only)
  router.put(
    '/advances/:id/disburse',
    authMiddleware,
    requirePermission('expenses.approve_all'),
    validateRequest(disburseAdvanceSchema),
    controller.disburseAdvance
  );

  // Settle advance (HR Admin only)
  router.put(
    '/advances/:id/settle',
    authMiddleware,
    requirePermission('expenses.approve_all'),
    validateRequest(settleAdvanceSchema),
    controller.settleAdvance
  );

  return router;
}
