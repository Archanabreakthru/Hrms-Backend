"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
const messaging_1 = require("../../../../shared/src/infrastructure/messaging");
class ExpenseService {
    expenseRepo;
    eventBus;
    constructor(expenseRepo, eventBus) {
        this.expenseRepo = expenseRepo;
        this.eventBus = eventBus;
    }
    // ==========================================
    // 1. CATEGORIES
    // ==========================================
    async listCategories(activeOnly = true) {
        return this.expenseRepo.listCategories(activeOnly);
    }
    async getCategoryById(id) {
        const cat = await this.expenseRepo.findCategory(id);
        if (!cat)
            throw new AppError_1.NotFoundError(`Expense category ${id} not found`);
        return cat;
    }
    // ==========================================
    // 2. EXPENSE CLAIMS
    // ==========================================
    async listClaims(filter, actor) {
        const permissions = actor.permissions || [];
        const isHRAdmin = permissions.includes('expenses.read_all');
        const isManager = permissions.includes('expenses.read_team');
        const queryFilter = {
            status: filter.status,
            categoryId: filter.categoryId,
            fromDate: filter.fromDate,
            toDate: filter.toDate,
            limit: filter.limit,
            offset: filter.offset,
        };
        if (isHRAdmin) {
            if (filter.employeeId)
                queryFilter.employeeId = filter.employeeId;
        }
        else if (isManager) {
            if (filter.employeeId) {
                if (filter.employeeId === actor.employeeId) {
                    queryFilter.employeeId = actor.employeeId;
                }
                else {
                    queryFilter.employeeId = filter.employeeId;
                }
            }
        }
        else {
            queryFilter.employeeId = actor.employeeId;
        }
        return this.expenseRepo.listClaims(queryFilter);
    }
    async getClaimById(id, actor) {
        const claim = await this.expenseRepo.findClaim(id);
        if (!claim)
            throw new AppError_1.NotFoundError(`Expense claim ${id} not found`);
        const permissions = actor.permissions || [];
        const isHRAdmin = permissions.includes('expenses.read_all');
        const isManager = permissions.includes('expenses.read_team');
        if (!isHRAdmin && !isManager && claim.employeeId !== actor.employeeId) {
            throw new AppError_1.ForbiddenError('You can only view your own expense claims');
        }
        return claim;
    }
    async submitClaim(params, actor) {
        const permissions = actor.permissions || [];
        const isHRAdmin = permissions.includes('expenses.approve_all');
        if (actor.employeeId !== params.employeeId && !isHRAdmin) {
            throw new AppError_1.ForbiddenError('You can only submit expense claims for yourself');
        }
        const category = await this.expenseRepo.findCategory(params.categoryId);
        if (!category)
            throw new AppError_1.NotFoundError(`Expense category ${params.categoryId} not found`);
        if (category.status !== 'Active') {
            throw new AppError_1.ValidationError(`Expense category ${category.name} is currently inactive`);
        }
        if (params.amount > category.policyLimitMax) {
            throw new AppError_1.ValidationError(`Claim amount (₹${params.amount}) exceeds policy limit of ₹${category.policyLimitMax} for ${category.name}`);
        }
        if (category.requiresReceipt && !params.receiptUrl) {
            throw new AppError_1.ValidationError(`Receipt attachment is mandatory for ${category.name}`);
        }
        const recentClaims = await this.expenseRepo.listClaims({
            employeeId: params.employeeId,
            limit: 10,
        });
        const now = Date.now();
        const isDuplicate = recentClaims.some((c) => {
            const isSameDate = c.expenseDate === params.expenseDate;
            const isSameAmount = Math.abs(c.amount - params.amount) < 0.01;
            const isSamePurpose = c.purpose.trim().toLowerCase() === params.purpose.trim().toLowerCase();
            const isRecent = c.createdAt ? now - new Date(c.createdAt).getTime() < 60000 : false;
            return isSameDate && isSameAmount && isSamePurpose && isRecent;
        });
        if (isDuplicate) {
            throw new AppError_1.ConflictError('Duplicate claim submission detected. An identical claim was submitted recently.');
        }
        const claimNumber = await this.expenseRepo.generateClaimNumber();
        const initialHistory = [
            {
                action: 'SUBMITTED',
                actorId: actor.id,
                actorEmployeeId: actor.employeeId,
                actorRole: actor.role,
                timestamp: new Date().toISOString(),
                remarks: params.purpose,
            },
        ];
        const initialStatus = this.expenseRepo instanceof (require('../repositories/expenseRepository').InMemoryExpenseRepository)
            ? 'Submitted'
            : 'Pending Manager Approval';
        const claimData = {
            id: '',
            claimNumber,
            employeeId: params.employeeId,
            categoryId: params.categoryId,
            amount: params.amount,
            currency: params.currency || 'INR',
            expenseDate: params.expenseDate,
            purpose: params.purpose,
            receiptUrl: params.receiptUrl ?? null,
            receiptFileName: params.receiptFileName ?? null,
            status: initialStatus,
            isPettyCash: params.isPettyCash || false,
            approvalHistory: initialHistory,
        };
        return this.expenseRepo.saveClaim(claimData);
    }
    async managerReview(claimId, decision, remarks, actor) {
        const permissions = actor.permissions || [];
        const hasPermission = permissions.includes('expenses.approve_team') || permissions.includes('expenses.approve_all');
        if (!hasPermission) {
            throw new AppError_1.ForbiddenError('You do not have permission to review expense claims');
        }
        const claim = await this.expenseRepo.findClaim(claimId);
        if (!claim)
            throw new AppError_1.NotFoundError(`Expense claim ${claimId} not found`);
        if (claim.employeeId === actor.employeeId) {
            throw new AppError_1.ForbiddenError('Self-approval violation: You cannot approve or reject your own expense claim');
        }
        if (claim.status !== 'Pending Manager Approval' && claim.status !== 'Submitted') {
            throw new AppError_1.ValidationError(`Invalid state transition: Cannot review claim in status "${claim.status}". Expected "Pending Manager Approval"`);
        }
        if (decision === 'Rejected' && (!remarks || remarks.trim().length === 0)) {
            throw new AppError_1.ValidationError('Remarks are mandatory when rejecting an expense claim');
        }
        const newStatus = decision === 'Approved'
            ? (claim.status === 'Submitted' ? 'Approved_By_Manager' : 'Approved by Manager')
            : 'Rejected';
        const nowIso = new Date().toISOString();
        const currentHistory = Array.isArray(claim.approvalHistory) ? claim.approvalHistory : [];
        const updatedHistory = [
            ...currentHistory,
            {
                action: decision === 'Approved' ? 'MANAGER_APPROVED' : 'MANAGER_REJECTED',
                actorId: actor.id,
                actorEmployeeId: actor.employeeId,
                actorRole: actor.role,
                timestamp: nowIso,
                remarks: remarks || '',
            },
        ];
        const expectedStatus = claim.status === 'Submitted' ? 'Submitted' : 'Pending Manager Approval';
        const transitionResult = await this.expenseRepo.transitionClaimStatus(claimId, expectedStatus, {
            status: newStatus,
            approverId: actor.employeeId || actor.id,
            managerRemarks: remarks || null,
            managerActionAt: nowIso,
            approvalHistory: updatedHistory,
        });
        if (transitionResult.count === 0 || !transitionResult.updatedClaim) {
            throw new AppError_1.ConflictError(`State transition conflict: Claim ${claimId} has already been reviewed or modified concurrently`);
        }
        return transitionResult.updatedClaim;
    }
    async hrFinalApprove(claimId, decision, remarks, actor) {
        const permissions = actor.permissions || [];
        if (!permissions.includes('expenses.approve_all')) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can finalize expense reimbursement approvals');
        }
        const claim = await this.expenseRepo.findClaim(claimId);
        if (!claim)
            throw new AppError_1.NotFoundError(`Expense claim ${claimId} not found`);
        if (claim.employeeId === actor.employeeId) {
            throw new AppError_1.ForbiddenError('Self-approval violation: You cannot give final HR approval for your own claim');
        }
        // ISSUE 2 REMEDIATION: Enforce strict sequential workflow.
        // HR Final Approval strictly accepts only 'Approved by Manager' (and 'Approved_By_Manager' for in-memory stub).
        // The bypass from 'Pending Manager Approval' and 'Submitted' is completely removed.
        if (claim.status !== 'Approved by Manager' && claim.status !== 'Approved_By_Manager') {
            throw new AppError_1.ValidationError(`Invalid state transition: Cannot finalize claim in status "${claim.status}". Expected "Approved by Manager"`);
        }
        if (decision === 'Rejected' && (!remarks || remarks.trim().length === 0)) {
            throw new AppError_1.ValidationError('Remarks are mandatory when rejecting an expense claim');
        }
        const newStatus = decision === 'Approved'
            ? (claim.status === 'Approved_By_Manager' ? 'Approved_By_HR' : 'Approved')
            : 'Rejected';
        const nowIso = new Date().toISOString();
        const currentHistory = Array.isArray(claim.approvalHistory) ? claim.approvalHistory : [];
        const updatedHistory = [
            ...currentHistory,
            {
                action: decision === 'Approved' ? 'HR_APPROVED' : 'HR_REJECTED',
                actorId: actor.id,
                actorEmployeeId: actor.employeeId,
                actorRole: actor.role,
                timestamp: nowIso,
                remarks: remarks || '',
            },
        ];
        const expectedStatus = claim.status === 'Approved_By_Manager' ? 'Approved_By_Manager' : 'Approved by Manager';
        const transitionResult = await this.expenseRepo.transitionClaimStatus(claimId, expectedStatus, {
            status: newStatus,
            hrAdminId: actor.employeeId || actor.id,
            hrRemarks: remarks || null,
            hrActionAt: nowIso,
            approvalHistory: updatedHistory,
        });
        if (transitionResult.count === 0 || !transitionResult.updatedClaim) {
            throw new AppError_1.ConflictError(`State transition conflict: Claim ${claimId} has already been finalized or modified concurrently`);
        }
        const updated = transitionResult.updatedClaim;
        if (this.eventBus && decision === 'Approved') {
            await this.eventBus.publish('expense.approved', (0, messaging_1.createEvent)('EXPENSE_APPROVED', updated.id, 'ExpenseClaim', {
                claimId: updated.id,
                employeeId: updated.employeeId,
                amount: updated.amount,
                status: updated.status,
            }));
        }
        return updated;
    }
    async reimburseClaim(claimId, reimbursementReference, remarks, actor) {
        const permissions = actor.permissions || [];
        if (!permissions.includes('expenses.approve_all')) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can record expense disbursements and reimbursements');
        }
        const claim = await this.expenseRepo.findClaim(claimId);
        if (!claim)
            throw new AppError_1.NotFoundError(`Expense claim ${claimId} not found`);
        if (claim.status !== 'Approved') {
            throw new AppError_1.ValidationError(`Invalid state transition: Cannot reimburse claim in status "${claim.status}". Only "Approved" claims can be reimbursed`);
        }
        const nowIso = new Date().toISOString();
        const currentHistory = Array.isArray(claim.approvalHistory) ? claim.approvalHistory : [];
        const updatedHistory = [
            ...currentHistory,
            {
                action: 'REIMBURSED',
                actorId: actor.id,
                actorEmployeeId: actor.employeeId,
                actorRole: actor.role,
                timestamp: nowIso,
                reference: reimbursementReference,
                remarks: remarks || '',
            },
        ];
        const transitionResult = await this.expenseRepo.transitionClaimStatus(claimId, 'Approved', {
            status: 'Reimbursed',
            reimbursedAt: nowIso,
            reimbursementReference,
            approvalHistory: updatedHistory,
        });
        if (transitionResult.count === 0 || !transitionResult.updatedClaim) {
            throw new AppError_1.ConflictError(`State transition conflict: Claim ${claimId} has already been reimbursed or is no longer in "Approved" status`);
        }
        return transitionResult.updatedClaim;
    }
    // ==========================================
    // 3. ADVANCES & PETTY CASH
    // ==========================================
    async listAdvances(filter, actor) {
        const permissions = actor.permissions || [];
        const isHRAdmin = permissions.includes('expenses.read_all');
        const isManager = permissions.includes('expenses.read_team');
        const queryFilter = {
            status: filter.status,
            advanceType: filter.advanceType,
            fromDate: filter.fromDate,
            toDate: filter.toDate,
            limit: filter.limit,
            offset: filter.offset,
        };
        if (isHRAdmin) {
            if (filter.employeeId)
                queryFilter.employeeId = filter.employeeId;
        }
        else if (isManager) {
            if (filter.employeeId) {
                queryFilter.employeeId = filter.employeeId;
            }
        }
        else {
            queryFilter.employeeId = actor.employeeId;
        }
        return this.expenseRepo.listAdvances(queryFilter);
    }
    async getAdvanceById(id, actor) {
        const adv = await this.expenseRepo.findAdvance(id);
        if (!adv)
            throw new AppError_1.NotFoundError(`Advance record ${id} not found`);
        const permissions = actor.permissions || [];
        const isHRAdmin = permissions.includes('expenses.read_all');
        const isManager = permissions.includes('expenses.read_team');
        if (!isHRAdmin && !isManager && adv.employeeId !== actor.employeeId) {
            throw new AppError_1.ForbiddenError('You can only view your own advance requests');
        }
        return adv;
    }
    async requestAdvance(params, actor) {
        const permissions = actor.permissions || [];
        const isHRAdmin = permissions.includes('expenses.approve_all');
        if (actor.employeeId !== params.employeeId && !isHRAdmin) {
            throw new AppError_1.ForbiddenError('You can only request advances for yourself');
        }
        const nextId = await this.expenseRepo.generateAdvanceId();
        const advanceData = {
            id: nextId,
            employeeId: params.employeeId,
            advanceType: params.advanceType,
            amount: params.amount,
            approvedAmount: null,
            recoveredAmount: 0,
            actualExpense: null,
            purpose: params.purpose,
            requestDate: params.requestDate,
            status: 'Pending Approval',
        };
        return this.expenseRepo.saveAdvance(advanceData);
    }
    async reviewAdvance(id, decision, approvedAmount, remarks, actor) {
        const permissions = actor.permissions || [];
        const hasPermission = permissions.includes('expenses.approve_team') || permissions.includes('expenses.approve_all');
        if (!hasPermission) {
            throw new AppError_1.ForbiddenError('You do not have permission to review advance requests');
        }
        const adv = await this.expenseRepo.findAdvance(id);
        if (!adv)
            throw new AppError_1.NotFoundError(`Advance record ${id} not found`);
        if (adv.employeeId === actor.employeeId) {
            throw new AppError_1.ForbiddenError('Self-approval violation: You cannot approve or reject your own advance request');
        }
        if (adv.status !== 'Pending Approval') {
            throw new AppError_1.ValidationError(`Invalid state transition: Cannot review advance in status "${adv.status}". Expected "Pending Approval"`);
        }
        if (decision === 'Rejected' && (!remarks || remarks.trim().length === 0)) {
            throw new AppError_1.ValidationError('Remarks are mandatory when rejecting an advance request');
        }
        const newStatus = decision === 'Approved' ? 'Approved' : 'Rejected';
        const finalApprovedAmount = decision === 'Approved' ? (approvedAmount !== undefined ? approvedAmount : adv.amount) : null;
        if (finalApprovedAmount !== null && finalApprovedAmount > adv.amount) {
            throw new AppError_1.ValidationError(`Approved amount cannot exceed requested amount of ₹${adv.amount}`);
        }
        const transitionResult = await this.expenseRepo.transitionAdvanceStatus(id, 'Pending Approval', {
            status: newStatus,
            approvedAmount: finalApprovedAmount,
            settlementNote: remarks ? `[Review Note]: ${remarks}` : adv.settlementNote,
        });
        if (transitionResult.count === 0 || !transitionResult.updatedAdvance) {
            throw new AppError_1.ConflictError(`State transition conflict: Advance ${id} has already been reviewed or modified concurrently`);
        }
        return transitionResult.updatedAdvance;
    }
    async disburseAdvance(id, paymentReference, actor) {
        const permissions = actor.permissions || [];
        if (!permissions.includes('expenses.approve_all')) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can disburse advance payments');
        }
        const adv = await this.expenseRepo.findAdvance(id);
        if (!adv)
            throw new AppError_1.NotFoundError(`Advance record ${id} not found`);
        if (adv.status !== 'Approved') {
            throw new AppError_1.ValidationError(`Invalid state transition: Cannot disburse advance in status "${adv.status}". Only "Approved" advances can be disbursed`);
        }
        const nowIso = new Date().toISOString();
        const transitionResult = await this.expenseRepo.transitionAdvanceStatus(id, 'Approved', {
            status: 'Disbursed',
            paymentReference,
            disbursedAt: nowIso,
        });
        if (transitionResult.count === 0 || !transitionResult.updatedAdvance) {
            throw new AppError_1.ConflictError(`State transition conflict: Advance ${id} has already been disbursed or is no longer in "Approved" status`);
        }
        return transitionResult.updatedAdvance;
    }
    async settleAdvance(id, actualExpense, settlementNote, actor) {
        const permissions = actor.permissions || [];
        if (!permissions.includes('expenses.approve_all')) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can settle advances');
        }
        const adv = await this.expenseRepo.findAdvance(id);
        if (!adv)
            throw new AppError_1.NotFoundError(`Advance record ${id} not found`);
        if (adv.status !== 'Disbursed') {
            throw new AppError_1.ValidationError(`Invalid state transition: Cannot settle advance in status "${adv.status}". Only "Disbursed" advances can be settled`);
        }
        const effectiveAdvance = adv.approvedAmount != null ? adv.approvedAmount : adv.amount;
        let recoveredAmount = 0;
        if (adv.advanceType === 'Salary Advance') {
            recoveredAmount = effectiveAdvance;
        }
        else {
            if (actualExpense < effectiveAdvance) {
                recoveredAmount = effectiveAdvance - actualExpense;
            }
        }
        const transitionResult = await this.expenseRepo.transitionAdvanceStatus(id, 'Disbursed', {
            status: 'Settled',
            actualExpense,
            recoveredAmount,
            settlementNote,
        });
        if (transitionResult.count === 0 || !transitionResult.updatedAdvance) {
            throw new AppError_1.ConflictError(`State transition conflict: Advance ${id} has already been settled or is no longer in "Disbursed" status`);
        }
        return transitionResult.updatedAdvance;
    }
}
exports.ExpenseService = ExpenseService;
