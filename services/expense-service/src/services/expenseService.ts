import {
  IExpenseRepository,
  ExpenseClaimDTO,
} from '../repositories/expenseRepository';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../../../shared/src/errors/AppError';
import { AuthenticatedUser } from '../../../../shared/src/contracts/auth';
import { UserRole } from '../../../../shared/src/constants/roles';
import { EventPublisher, createEvent } from '../../../../shared/src/infrastructure/messaging';

export class ExpenseService {
  constructor(
    private expenseRepo: IExpenseRepository,
    private eventBus?: EventPublisher
  ) {}

  async submitClaim(
    params: {
      employeeId: string;
      categoryId: string;
      amount: number;
      expenseDate: string;
      purpose: string;
      receiptUrl?: string;
      isPettyCash?: boolean;
    },
    actor: AuthenticatedUser
  ): Promise<ExpenseClaimDTO> {
    if (actor.employeeId !== params.employeeId && actor.role !== UserRole.HR_ADMIN) {
      throw new ForbiddenError('You can only submit expense claims for yourself');
    }

    const category = await this.expenseRepo.findCategory(params.categoryId);
    if (!category) throw new NotFoundError(`Expense category ${params.categoryId} not found`);

    // Policy limit check
    if (params.amount > category.policyLimitMax) {
      throw new ValidationError(
        `Claim amount (₹${params.amount}) exceeds category policy limit of ₹${category.policyLimitMax}`
      );
    }

    if (category.requiresReceipt && !params.receiptUrl) {
      throw new ValidationError(`Receipt attachment is required for ${category.name}`);
    }

    const claim: ExpenseClaimDTO = {
      id: `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      claimNumber: `EXP-${Date.now().toString().slice(-6)}`,
      employeeId: params.employeeId,
      categoryId: params.categoryId,
      amount: params.amount,
      currency: 'INR',
      expenseDate: params.expenseDate,
      purpose: params.purpose,
      receiptUrl: params.receiptUrl,
      status: 'Submitted',
      isPettyCash: params.isPettyCash || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.expenseRepo.saveClaim(claim);
  }

  async managerReview(
    claimId: string,
    decision: 'Approved' | 'Rejected',
    remarks: string | undefined,
    actor: AuthenticatedUser
  ): Promise<ExpenseClaimDTO> {
    const isManager =
      actor.role === UserRole.REPORTING_MANAGER ||
      actor.role === UserRole.SENIOR_MANAGER ||
      actor.role === UserRole.HR_ADMIN;

    if (!isManager) {
      throw new ForbiddenError('Only reporting managers can review employee expense claims');
    }

    const claim = await this.expenseRepo.findClaim(claimId);
    if (!claim) throw new NotFoundError(`Expense claim ${claimId} not found`);

    if (claim.status !== 'Submitted') {
      throw new ValidationError(`Claim has already been ${claim.status.toLowerCase()}`);
    }

    claim.status = decision === 'Approved' ? 'Approved_By_Manager' : 'Rejected';
    claim.managerId = actor.id;
    claim.managerRemarks = remarks;
    claim.managerActionAt = new Date().toISOString();
    claim.updatedAt = new Date();

    return this.expenseRepo.saveClaim(claim);
  }

  async hrFinalApprove(
    claimId: string,
    decision: 'Approved' | 'Rejected',
    remarks: string | undefined,
    actor: AuthenticatedUser
  ): Promise<ExpenseClaimDTO> {
    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only HR Administrators can finalize expense reimbursement approvals');
    }

    const claim = await this.expenseRepo.findClaim(claimId);
    if (!claim) throw new NotFoundError(`Expense claim ${claimId} not found`);

    claim.status = decision === 'Approved' ? 'Approved_By_HR' : 'Rejected';
    claim.hrAdminId = actor.id;
    claim.hrRemarks = remarks;
    claim.hrActionAt = new Date().toISOString();
    claim.updatedAt = new Date();

    const saved = await this.expenseRepo.saveClaim(claim);

    if (this.eventBus && decision === 'Approved') {
      await this.eventBus.publish(
        'expense.approved',
        createEvent('EXPENSE_APPROVED', saved.id, 'ExpenseClaim', {
          claimId: saved.id,
          employeeId: saved.employeeId,
          amount: saved.amount,
          status: saved.status,
        })
      );
    }

    return saved;
  }
}

