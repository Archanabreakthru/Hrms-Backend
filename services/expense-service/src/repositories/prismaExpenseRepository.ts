import { PrismaClient } from '../generated/client';
import {
  IExpenseRepository,
  ExpenseCategoryDTO,
  ExpenseClaimDTO,
  AdvancePettyCashDTO,
  ClaimFilterOptions,
  AdvanceFilterOptions,
} from './expenseRepository';

export class PrismaExpenseRepository implements IExpenseRepository {
  constructor(private prisma: PrismaClient) {}

  private mapCategory(raw: any): ExpenseCategoryDTO {
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      description: raw.description,
      policyLimitMax: typeof raw.maxLimitPerClaim === 'object' && raw.maxLimitPerClaim !== null ? Number(raw.maxLimitPerClaim) : Number(raw.maxLimitPerClaim || 0),
      requiresReceipt: Boolean(raw.requiresReceipt),
      status: raw.isActive ? 'Active' : 'Inactive',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapClaim(raw: any): ExpenseClaimDTO {
    return {
      id: raw.id,
      claimNumber: raw.claimNumber,
      employeeId: raw.employeeId,
      categoryId: raw.categoryId,
      amount: typeof raw.amount === 'object' && raw.amount !== null ? Number(raw.amount) : Number(raw.amount || 0),
      currency: raw.currency || 'INR',
      expenseDate: raw.expenseDate instanceof Date ? raw.expenseDate.toISOString().split('T')[0] : String(raw.expenseDate),
      purpose: raw.purpose,
      receiptUrl: raw.receiptUrl ?? undefined,
      receiptFileName: raw.receiptFileName ?? undefined,
      status: raw.status,
      approverId: raw.approverId ?? undefined,
      managerRemarks: raw.managerRemarks ?? undefined,
      managerActionAt: raw.managerActionAt ? (raw.managerActionAt instanceof Date ? raw.managerActionAt.toISOString() : String(raw.managerActionAt)) : undefined,
      hrAdminId: raw.hrAdminId ?? undefined,
      hrRemarks: raw.hrRemarks ?? undefined,
      hrActionAt: raw.hrActionAt ? (raw.hrActionAt instanceof Date ? raw.hrActionAt.toISOString() : String(raw.hrActionAt)) : undefined,
      reimbursedAt: raw.reimbursedAt ? (raw.reimbursedAt instanceof Date ? raw.reimbursedAt.toISOString() : String(raw.reimbursedAt)) : undefined,
      reimbursementReference: raw.reimbursementReference ?? undefined,
      isPettyCash: Boolean(raw.isPettyCash),
      approvalHistory: raw.approvalHistory,
      category: raw.category ? this.mapCategory(raw.category) : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapAdvance(raw: any): AdvancePettyCashDTO {
    return {
      id: raw.id,
      employeeId: raw.employeeId,
      advanceType: raw.advanceType,
      amount: typeof raw.amount === 'object' && raw.amount !== null ? Number(raw.amount) : Number(raw.amount || 0),
      approvedAmount: raw.approvedAmount != null ? Number(raw.approvedAmount) : undefined,
      recoveredAmount: raw.recoveredAmount != null ? Number(raw.recoveredAmount) : 0,
      actualExpense: raw.actualExpense != null ? Number(raw.actualExpense) : undefined,
      purpose: raw.purpose,
      requestDate: raw.requestDate instanceof Date ? raw.requestDate.toISOString().split('T')[0] : String(raw.requestDate),
      status: raw.status,
      paymentReference: raw.paymentReference ?? undefined,
      settlementNote: raw.settlementNote ?? undefined,
      disbursedAt: raw.disbursedAt ? (raw.disbursedAt instanceof Date ? raw.disbursedAt.toISOString() : String(raw.disbursedAt)) : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  // --- Categories ---
  async findCategory(id: string): Promise<ExpenseCategoryDTO | null> {
    const raw = await this.prisma.expenseCategory.findUnique({ where: { id } });
    return raw ? this.mapCategory(raw) : null;
  }

  async findCategoryByCode(code: string): Promise<ExpenseCategoryDTO | null> {
    const raw = await this.prisma.expenseCategory.findUnique({ where: { code } });
    return raw ? this.mapCategory(raw) : null;
  }

  async listCategories(activeOnly = true): Promise<ExpenseCategoryDTO[]> {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    const list = await this.prisma.expenseCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return list.map((c) => this.mapCategory(c));
  }

  async saveCategory(cat: Omit<ExpenseCategoryDTO, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ExpenseCategoryDTO> {
    if (cat.id) {
      const updated = await this.prisma.expenseCategory.upsert({
        where: { id: cat.id },
        update: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
          maxLimitPerClaim: cat.policyLimitMax,
          requiresReceipt: cat.requiresReceipt,
          isActive: cat.status === 'Active',
        },
        create: {
          id: cat.id,
          code: cat.code,
          name: cat.name,
          description: cat.description,
          maxLimitPerClaim: cat.policyLimitMax,
          requiresReceipt: cat.requiresReceipt,
          isActive: cat.status === 'Active',
        },
      });
      return this.mapCategory(updated);
    }

    const created = await this.prisma.expenseCategory.create({
      data: {
        code: cat.code,
        name: cat.name,
        description: cat.description,
        maxLimitPerClaim: cat.policyLimitMax,
        requiresReceipt: cat.requiresReceipt,
        isActive: cat.status === 'Active',
      },
    });
    return this.mapCategory(created);
  }

  // --- Claims ---
  async findClaim(id: string): Promise<ExpenseClaimDTO | null> {
    const raw = await this.prisma.expenseClaim.findUnique({
      where: { id },
      include: { category: true },
    });
    return raw ? this.mapClaim(raw) : null;
  }

  async findClaimByNumber(claimNumber: string): Promise<ExpenseClaimDTO | null> {
    const raw = await this.prisma.expenseClaim.findUnique({
      where: { claimNumber },
      include: { category: true },
    });
    return raw ? this.mapClaim(raw) : null;
  }

  async saveClaim(claim: ExpenseClaimDTO): Promise<ExpenseClaimDTO> {
    const dateObj = new Date(claim.expenseDate);
    const created = await this.prisma.expenseClaim.create({
      data: {
        ...(claim.id ? { id: claim.id } : {}),
        claimNumber: claim.claimNumber,
        employeeId: claim.employeeId,
        categoryId: claim.categoryId,
        amount: claim.amount,
        currency: claim.currency || 'INR',
        expenseDate: isNaN(dateObj.getTime()) ? new Date() : dateObj,
        purpose: claim.purpose,
        receiptUrl: claim.receiptUrl ?? null,
        receiptFileName: claim.receiptFileName ?? null,
        status: claim.status || 'Pending Manager Approval',
        approverId: claim.approverId ?? null,
        managerRemarks: claim.managerRemarks ?? null,
        managerActionAt: claim.managerActionAt ? new Date(claim.managerActionAt) : null,
        hrAdminId: claim.hrAdminId ?? null,
        hrRemarks: claim.hrRemarks ?? null,
        hrActionAt: claim.hrActionAt ? new Date(claim.hrActionAt) : null,
        reimbursedAt: claim.reimbursedAt ? new Date(claim.reimbursedAt) : null,
        reimbursementReference: claim.reimbursementReference ?? null,
        isPettyCash: claim.isPettyCash || false,
        approvalHistory: claim.approvalHistory ?? [],
      },
      include: { category: true },
    });
    return this.mapClaim(created);
  }

  async updateClaim(id: string, updates: Partial<ExpenseClaimDTO>): Promise<ExpenseClaimDTO> {
    const data: any = {};
    if (updates.claimNumber !== undefined) data.claimNumber = updates.claimNumber;
    if (updates.employeeId !== undefined) data.employeeId = updates.employeeId;
    if (updates.categoryId !== undefined) data.categoryId = updates.categoryId;
    if (updates.amount !== undefined) data.amount = updates.amount;
    if (updates.currency !== undefined) data.currency = updates.currency;
    if (updates.expenseDate !== undefined) {
      const d = new Date(updates.expenseDate);
      data.expenseDate = isNaN(d.getTime()) ? new Date() : d;
    }
    if (updates.purpose !== undefined) data.purpose = updates.purpose;
    if (updates.receiptUrl !== undefined) data.receiptUrl = updates.receiptUrl;
    if (updates.receiptFileName !== undefined) data.receiptFileName = updates.receiptFileName;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.approverId !== undefined) data.approverId = updates.approverId;
    if (updates.managerRemarks !== undefined) data.managerRemarks = updates.managerRemarks;
    if (updates.managerActionAt !== undefined) {
      data.managerActionAt = updates.managerActionAt ? new Date(updates.managerActionAt) : null;
    }
    if (updates.hrAdminId !== undefined) data.hrAdminId = updates.hrAdminId;
    if (updates.hrRemarks !== undefined) data.hrRemarks = updates.hrRemarks;
    if (updates.hrActionAt !== undefined) {
      data.hrActionAt = updates.hrActionAt ? new Date(updates.hrActionAt) : null;
    }
    if (updates.reimbursedAt !== undefined) {
      data.reimbursedAt = updates.reimbursedAt ? new Date(updates.reimbursedAt) : null;
    }
    if (updates.reimbursementReference !== undefined) data.reimbursementReference = updates.reimbursementReference;
    if (updates.isPettyCash !== undefined) data.isPettyCash = updates.isPettyCash;
    if (updates.approvalHistory !== undefined) data.approvalHistory = updates.approvalHistory;

    const updated = await this.prisma.expenseClaim.update({
      where: { id },
      data,
      include: { category: true },
    });
    return this.mapClaim(updated);
  }

  async transitionClaimStatus(
    id: string,
    expectedCurrentStatus: string | string[],
    updates: Partial<ExpenseClaimDTO>
  ): Promise<{ count: number; updatedClaim?: ExpenseClaimDTO }> {
    const data: any = {};
    if (updates.claimNumber !== undefined) data.claimNumber = updates.claimNumber;
    if (updates.employeeId !== undefined) data.employeeId = updates.employeeId;
    if (updates.categoryId !== undefined) data.categoryId = updates.categoryId;
    if (updates.amount !== undefined) data.amount = updates.amount;
    if (updates.currency !== undefined) data.currency = updates.currency;
    if (updates.expenseDate !== undefined) {
      const d = new Date(updates.expenseDate);
      data.expenseDate = isNaN(d.getTime()) ? new Date() : d;
    }
    if (updates.purpose !== undefined) data.purpose = updates.purpose;
    if (updates.receiptUrl !== undefined) data.receiptUrl = updates.receiptUrl;
    if (updates.receiptFileName !== undefined) data.receiptFileName = updates.receiptFileName;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.approverId !== undefined) data.approverId = updates.approverId;
    if (updates.managerRemarks !== undefined) data.managerRemarks = updates.managerRemarks;
    if (updates.managerActionAt !== undefined) {
      data.managerActionAt = updates.managerActionAt ? new Date(updates.managerActionAt) : null;
    }
    if (updates.hrAdminId !== undefined) data.hrAdminId = updates.hrAdminId;
    if (updates.hrRemarks !== undefined) data.hrRemarks = updates.hrRemarks;
    if (updates.hrActionAt !== undefined) {
      data.hrActionAt = updates.hrActionAt ? new Date(updates.hrActionAt) : null;
    }
    if (updates.reimbursedAt !== undefined) {
      data.reimbursedAt = updates.reimbursedAt ? new Date(updates.reimbursedAt) : null;
    }
    if (updates.reimbursementReference !== undefined) data.reimbursementReference = updates.reimbursementReference;
    if (updates.isPettyCash !== undefined) data.isPettyCash = updates.isPettyCash;
    if (updates.approvalHistory !== undefined) data.approvalHistory = updates.approvalHistory;

    const statusCondition = Array.isArray(expectedCurrentStatus)
      ? { in: expectedCurrentStatus }
      : expectedCurrentStatus;

    // Atomic conditional update at PostgreSQL database level
    const updateResult = await this.prisma.expenseClaim.updateMany({
      where: {
        id,
        status: statusCondition,
      },
      data,
    });

    if (updateResult.count === 0) {
      return { count: 0 };
    }

    const updatedClaim = await this.findClaim(id);
    return { count: updateResult.count, updatedClaim: updatedClaim || undefined };
  }

  async listClaims(filter: ClaimFilterOptions): Promise<ExpenseClaimDTO[]> {
    const where: any = {};
    if (filter.employeeId) {
      where.employeeId = filter.employeeId;
    } else if (filter.employeeIds && filter.employeeIds.length > 0) {
      where.employeeId = { in: filter.employeeIds };
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }
    if (filter.fromDate || filter.toDate) {
      where.expenseDate = {};
      if (filter.fromDate) where.expenseDate.gte = new Date(filter.fromDate);
      if (filter.toDate) where.expenseDate.lte = new Date(filter.toDate);
    }

    const list = await this.prisma.expenseClaim.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    });
    return list.map((c) => this.mapClaim(c));
  }

  async generateClaimNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `EXP-${currentYear}-`;

    const latest = await this.prisma.expenseClaim.findFirst({
      where: { claimNumber: { startsWith: prefix } },
      orderBy: { claimNumber: 'desc' },
      select: { claimNumber: true },
    });

    let nextSeq = 1;
    if (latest && latest.claimNumber) {
      const parts = latest.claimNumber.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num)) nextSeq = num + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  // --- Advances / Petty Cash ---
  async findAdvance(id: string): Promise<AdvancePettyCashDTO | null> {
    const raw = await this.prisma.advancePettyCash.findUnique({ where: { id } });
    return raw ? this.mapAdvance(raw) : null;
  }

  async saveAdvance(adv: AdvancePettyCashDTO): Promise<AdvancePettyCashDTO> {
    const d = new Date(adv.requestDate);
    const created = await this.prisma.advancePettyCash.create({
      data: {
        id: adv.id,
        employeeId: adv.employeeId,
        advanceType: adv.advanceType,
        amount: adv.amount,
        approvedAmount: adv.approvedAmount ?? null,
        recoveredAmount: adv.recoveredAmount ?? 0,
        actualExpense: adv.actualExpense ?? null,
        purpose: adv.purpose,
        requestDate: isNaN(d.getTime()) ? new Date() : d,
        status: adv.status || 'Pending Approval',
        paymentReference: adv.paymentReference ?? null,
        settlementNote: adv.settlementNote ?? null,
        disbursedAt: adv.disbursedAt ? new Date(adv.disbursedAt) : null,
      },
    });
    return this.mapAdvance(created);
  }

  async updateAdvance(id: string, updates: Partial<AdvancePettyCashDTO>): Promise<AdvancePettyCashDTO> {
    const data: any = {};
    if (updates.advanceType !== undefined) data.advanceType = updates.advanceType;
    if (updates.amount !== undefined) data.amount = updates.amount;
    if (updates.approvedAmount !== undefined) data.approvedAmount = updates.approvedAmount;
    if (updates.recoveredAmount !== undefined) data.recoveredAmount = updates.recoveredAmount;
    if (updates.actualExpense !== undefined) data.actualExpense = updates.actualExpense;
    if (updates.purpose !== undefined) data.purpose = updates.purpose;
    if (updates.requestDate !== undefined) {
      const d = new Date(updates.requestDate);
      data.requestDate = isNaN(d.getTime()) ? new Date() : d;
    }
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.paymentReference !== undefined) data.paymentReference = updates.paymentReference;
    if (updates.settlementNote !== undefined) data.settlementNote = updates.settlementNote;
    if (updates.disbursedAt !== undefined) {
      data.disbursedAt = updates.disbursedAt ? new Date(updates.disbursedAt) : null;
    }

    const updated = await this.prisma.advancePettyCash.update({
      where: { id },
      data,
    });
    return this.mapAdvance(updated);
  }

  async transitionAdvanceStatus(
    id: string,
    expectedCurrentStatus: string | string[],
    updates: Partial<AdvancePettyCashDTO>
  ): Promise<{ count: number; updatedAdvance?: AdvancePettyCashDTO }> {
    const data: any = {};
    if (updates.advanceType !== undefined) data.advanceType = updates.advanceType;
    if (updates.amount !== undefined) data.amount = updates.amount;
    if (updates.approvedAmount !== undefined) data.approvedAmount = updates.approvedAmount;
    if (updates.recoveredAmount !== undefined) data.recoveredAmount = updates.recoveredAmount;
    if (updates.actualExpense !== undefined) data.actualExpense = updates.actualExpense;
    if (updates.purpose !== undefined) data.purpose = updates.purpose;
    if (updates.requestDate !== undefined) {
      const d = new Date(updates.requestDate);
      data.requestDate = isNaN(d.getTime()) ? new Date() : d;
    }
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.paymentReference !== undefined) data.paymentReference = updates.paymentReference;
    if (updates.settlementNote !== undefined) data.settlementNote = updates.settlementNote;
    if (updates.disbursedAt !== undefined) {
      data.disbursedAt = updates.disbursedAt ? new Date(updates.disbursedAt) : null;
    }

    const statusCondition = Array.isArray(expectedCurrentStatus)
      ? { in: expectedCurrentStatus }
      : expectedCurrentStatus;

    // Atomic conditional update at PostgreSQL database level
    const updateResult = await this.prisma.advancePettyCash.updateMany({
      where: {
        id,
        status: statusCondition,
      },
      data,
    });

    if (updateResult.count === 0) {
      return { count: 0 };
    }

    const updatedAdvance = await this.findAdvance(id);
    return { count: updateResult.count, updatedAdvance: updatedAdvance || undefined };
  }

  async listAdvances(filter: AdvanceFilterOptions): Promise<AdvancePettyCashDTO[]> {
    const where: any = {};
    if (filter.employeeId) {
      where.employeeId = filter.employeeId;
    } else if (filter.employeeIds && filter.employeeIds.length > 0) {
      where.employeeId = { in: filter.employeeIds };
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.advanceType) {
      where.advanceType = filter.advanceType;
    }
    if (filter.fromDate || filter.toDate) {
      where.requestDate = {};
      if (filter.fromDate) where.requestDate.gte = new Date(filter.fromDate);
      if (filter.toDate) where.requestDate.lte = new Date(filter.toDate);
    }

    const list = await this.prisma.advancePettyCash.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    });
    return list.map((a) => this.mapAdvance(a));
  }

  async generateAdvanceId(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `ADV-${currentYear}-`;

    const latest = await this.prisma.advancePettyCash.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    let nextSeq = 101;
    if (latest && latest.id) {
      const parts = latest.id.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num)) nextSeq = num + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }
}

