import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import { submitExpenseSchema, reviewExpenseSchema } from '../validators/expenseValidators';
import { config } from '../config/env';

export function createExpenseRouter(controller: ExpenseController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Submit Claim (Self)
  router.post(
    '/claims',
    authMiddleware,
    requirePermission('expenses.claim_self'),
    validateRequest(submitExpenseSchema),
    controller.submitClaim
  );

  // Manager Review
  router.put(
    '/claims/:id/manager-review',
    authMiddleware,
    requirePermission('expenses.approve_team', 'expenses.approve_all'),
    validateRequest(reviewExpenseSchema),
    controller.managerReview
  );

  // HR Final Approval
  router.put(
    '/claims/:id/hr-approve',
    authMiddleware,
    requirePermission('expenses.approve_all'),
    validateRequest(reviewExpenseSchema),
    controller.hrFinalApprove
  );

  return router;
}

