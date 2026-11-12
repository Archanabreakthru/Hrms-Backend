"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
const roles_1 = require("../../../../shared/src/constants/roles");
const messaging_1 = require("../../../../shared/src/infrastructure/messaging");
class ExpenseService {
    expenseRepo;
    eventBus;
    constructor(expenseRepo, eventBus) {
        this.expenseRepo = expenseRepo;
        this.eventBus = eventBus;
    }
    async submitClaim(params, actor) {
        if (actor.employeeId !== params.employeeId && actor.role !== roles_1.UserRole.HR_ADMIN) {
            throw new AppError_1.ForbiddenError('You can only submit expense claims for yourself');
        }
        const category = await this.expenseRepo.findCategory(params.categoryId);
        if (!category)
            throw new AppError_1.NotFoundError(`Expense category ${params.categoryId} not found`);
        // Policy limit check
        if (params.amount > category.policyLimitMax) {
            throw new AppError_1.ValidationError(`Claim amount (₹${params.amount}) exceeds category policy limit of ₹${category.policyLimitMax}`);
        }
        if (category.requiresReceipt && !params.receiptUrl) {
            throw new AppError_1.ValidationError(`Receipt attachment is required for ${category.name}`);
        }
        const claim = {
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
    async managerReview(claimId, decision, remarks, actor) {
        const isManager = actor.role === roles_1.UserRole.REPORTING_MANAGER ||
            actor.role === roles_1.UserRole.SENIOR_MANAGER ||
            actor.role === roles_1.UserRole.HR_ADMIN;
        if (!isManager) {
            throw new AppError_1.ForbiddenError('Only reporting managers can review employee expense claims');
        }
        const claim = await this.expenseRepo.findClaim(claimId);
        if (!claim)
            throw new AppError_1.NotFoundError(`Expense claim ${claimId} not found`);
        if (claim.status !== 'Submitted') {
            throw new AppError_1.ValidationError(`Claim has already been ${claim.status.toLowerCase()}`);
        }
        claim.status = decision === 'Approved' ? 'Approved_By_Manager' : 'Rejected';
        claim.managerId = actor.id;
        claim.managerRemarks = remarks;
        claim.managerActionAt = new Date().toISOString();
        claim.updatedAt = new Date();
        return this.expenseRepo.saveClaim(claim);
    }
    async hrFinalApprove(claimId, decision, remarks, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can finalize expense reimbursement approvals');
        }
        const claim = await this.expenseRepo.findClaim(claimId);
        if (!claim)
            throw new AppError_1.NotFoundError(`Expense claim ${claimId} not found`);
        claim.status = decision === 'Approved' ? 'Approved_By_HR' : 'Rejected';
        claim.hrAdminId = actor.id;
        claim.hrRemarks = remarks;
        claim.hrActionAt = new Date().toISOString();
        claim.updatedAt = new Date();
        const saved = await this.expenseRepo.saveClaim(claim);
        if (this.eventBus && decision === 'Approved') {
            await this.eventBus.publish('expense.approved', (0, messaging_1.createEvent)('EXPENSE_APPROVED', saved.id, 'ExpenseClaim', {
                claimId: saved.id,
                employeeId: saved.employeeId,
                amount: saved.amount,
                status: saved.status,
            }));
        }
        return saved;
    }
}
exports.ExpenseService = ExpenseService;
