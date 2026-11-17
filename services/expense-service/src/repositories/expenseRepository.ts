export interface ExpenseCategoryDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  policyLimitMax: number;
  requiresReceipt: boolean;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpenseClaimDTO {
  id: string;
  claimNumber: string;
  employeeId: string;
  categoryId: string;
  amount: number;
  currency: string;
  expenseDate: string;
  purpose: string;
  receiptUrl?: string | null;
  receiptFileName?: string | null;
  status: string;
  approverId?: string | null;
  managerId?: string | null;
  managerRemarks?: string | null;
  managerActionAt?: string | null;
  hrAdminId?: string | null;
  hrRemarks?: string | null;
  hrActionAt?: string | null;
  reimbursedAt?: string | null;
  reimbursementReference?: string | null;
  isPettyCash: boolean;
  approvalHistory?: any;
  category?: ExpenseCategoryDTO;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AdvancePettyCashDTO {
  id: string;
  employeeId: string;
  advanceType: string;
  amount: number;
  approvedAmount?: number | null;
  recoveredAmount?: number | null;
  actualExpense?: number | null;
  purpose: string;
  requestDate: string;
  status: string;
  paymentReference?: string | null;
  settlementNote?: string | null;
  disbursedAt?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClaimFilterOptions {
  employeeId?: string;
  employeeIds?: string[];
  status?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface AdvanceFilterOptions {
  employeeId?: string;
  employeeIds?: string[];
  status?: string;
  advanceType?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface IExpenseRepository {
  // Categories
  findCategory(id: string): Promise<ExpenseCategoryDTO | null>;
  findCategoryByCode(code: string): Promise<ExpenseCategoryDTO | null>;
  listCategories(activeOnly?: boolean): Promise<ExpenseCategoryDTO[]>;
  saveCategory(cat: Omit<ExpenseCategoryDTO, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ExpenseCategoryDTO>;

  // Claims
  findClaim(id: string): Promise<ExpenseClaimDTO | null>;
  findClaimByNumber(claimNumber: string): Promise<ExpenseClaimDTO | null>;
  saveClaim(claim: ExpenseClaimDTO): Promise<ExpenseClaimDTO>;
  updateClaim(id: string, updates: Partial<ExpenseClaimDTO>): Promise<ExpenseClaimDTO>;
  transitionClaimStatus(
    id: string,
    expectedCurrentStatus: string | string[],
    updates: Partial<ExpenseClaimDTO>
  ): Promise<{ count: number; updatedClaim?: ExpenseClaimDTO }>;
  listClaims(filter: ClaimFilterOptions): Promise<ExpenseClaimDTO[]>;
  generateClaimNumber(): Promise<string>;

  // Advances / Petty Cash
  findAdvance(id: string): Promise<AdvancePettyCashDTO | null>;
  saveAdvance(adv: AdvancePettyCashDTO): Promise<AdvancePettyCashDTO>;
  updateAdvance(id: string, updates: Partial<AdvancePettyCashDTO>): Promise<AdvancePettyCashDTO>;
  transitionAdvanceStatus(
    id: string,
    expectedCurrentStatus: string | string[],
    updates: Partial<AdvancePettyCashDTO>
  ): Promise<{ count: number; updatedAdvance?: AdvancePettyCashDTO }>;
  listAdvances(filter: AdvanceFilterOptions): Promise<AdvancePettyCashDTO[]>;
  generateAdvanceId(): Promise<string>;
}

export class InMemoryExpenseRepository implements IExpenseRepository {
  private categories = new Map<string, ExpenseCategoryDTO>();
  private claims = new Map<string, ExpenseClaimDTO>();
  private advances = new Map<string, AdvancePettyCashDTO>();
  private claimSeq = 1000;
  private advanceSeq = 100;

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const c1: ExpenseCategoryDTO = {
      id: 'CAT-TRAVEL',
      code: 'TRAVEL',
      name: 'Travel & Commute',
      policyLimitMax: 10000,
      requiresReceipt: true,
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const c2: ExpenseCategoryDTO = {
      id: 'CAT-FOOD',
      code: 'FOOD',
      name: 'Client Meal / Food',
      policyLimitMax: 2000,
      requiresReceipt: true,
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.categories.set(c1.id, c1);
    this.categories.set(c2.id, c2);
  }

  async findCategory(id: string): Promise<ExpenseCategoryDTO | null> {
    return this.categories.get(id) || null;
  }

  async findCategoryByCode(code: string): Promise<ExpenseCategoryDTO | null> {
    for (const cat of this.categories.values()) {
      if (cat.code.toUpperCase() === code.toUpperCase()) return cat;
    }
    return null;
  }

  async listCategories(activeOnly = true): Promise<ExpenseCategoryDTO[]> {
    const list = Array.from(this.categories.values());
    if (activeOnly) return list.filter((c) => c.status === 'Active');
    return list;
  }

  async saveCategory(cat: Omit<ExpenseCategoryDTO, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ExpenseCategoryDTO> {
    const id = cat.id || `CAT-${Date.now()}`;
    const full: ExpenseCategoryDTO = {
      ...cat,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.categories.set(id, full);
    return full;
  }

  async findClaim(id: string): Promise<ExpenseClaimDTO | null> {
    return this.claims.get(id) || null;
  }

  async findClaimByNumber(claimNumber: string): Promise<ExpenseClaimDTO | null> {
    for (const c of this.claims.values()) {
      if (c.claimNumber === claimNumber) return c;
    }
    return null;
  }

  async saveClaim(claim: ExpenseClaimDTO): Promise<ExpenseClaimDTO> {
    const id = claim.id || `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const full: ExpenseClaimDTO = {
      ...claim,
      id,
      createdAt: claim.createdAt || new Date(),
      updatedAt: claim.updatedAt || new Date(),
    };
    this.claims.set(id, full);
    return full;
  }

  async updateClaim(id: string, updates: Partial<ExpenseClaimDTO>): Promise<ExpenseClaimDTO> {
    const existing = this.claims.get(id);
    if (!existing) throw new Error(`Claim ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.claims.set(id, updated);
    return updated;
  }

  async transitionClaimStatus(
    id: string,
    expectedCurrentStatus: string | string[],
    updates: Partial<ExpenseClaimDTO>
  ): Promise<{ count: number; updatedClaim?: ExpenseClaimDTO }> {
    const existing = this.claims.get(id);
    if (!existing) return { count: 0 };

    const expectedArray = Array.isArray(expectedCurrentStatus)
      ? expectedCurrentStatus
      : [expectedCurrentStatus];

    if (!expectedArray.includes(existing.status)) {
      return { count: 0 };
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.claims.set(id, updated);
    return { count: 1, updatedClaim: updated };
  }

  async listClaims(filter: ClaimFilterOptions): Promise<ExpenseClaimDTO[]> {
    let list = Array.from(this.claims.values());
    if (filter.employeeId) list = list.filter((c) => c.employeeId === filter.employeeId);
    if (filter.employeeIds && filter.employeeIds.length > 0) {
      list = list.filter((c) => filter.employeeIds!.includes(c.employeeId));
    }
    if (filter.status) list = list.filter((c) => c.status === filter.status);
    if (filter.categoryId) list = list.filter((c) => c.categoryId === filter.categoryId);
    return list;
  }

  async generateClaimNumber(): Promise<string> {
    this.claimSeq += 1;
    const year = new Date().getFullYear();
    return `EXP-${year}-${String(this.claimSeq).padStart(5, '0')}`;
  }

  async findAdvance(id: string): Promise<AdvancePettyCashDTO | null> {
    return this.advances.get(id) || null;
  }

  async saveAdvance(adv: AdvancePettyCashDTO): Promise<AdvancePettyCashDTO> {
    this.advances.set(adv.id, { ...adv });
    return adv;
  }

  async updateAdvance(id: string, updates: Partial<AdvancePettyCashDTO>): Promise<AdvancePettyCashDTO> {
    const existing = this.advances.get(id);
    if (!existing) throw new Error(`Advance ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.advances.set(id, updated);
    return updated;
  }

  async transitionAdvanceStatus(
    id: string,
    expectedCurrentStatus: string | string[],
    updates: Partial<AdvancePettyCashDTO>
  ): Promise<{ count: number; updatedAdvance?: AdvancePettyCashDTO }> {
    const existing = this.advances.get(id);
    if (!existing) return { count: 0 };

    const expectedArray = Array.isArray(expectedCurrentStatus)
      ? expectedCurrentStatus
      : [expectedCurrentStatus];

    if (!expectedArray.includes(existing.status)) {
      return { count: 0 };
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.advances.set(id, updated);
    return { count: 1, updatedAdvance: updated };
  }

  async listAdvances(filter: AdvanceFilterOptions): Promise<AdvancePettyCashDTO[]> {
    let list = Array.from(this.advances.values());
    if (filter.employeeId) list = list.filter((a) => a.employeeId === filter.employeeId);
    if (filter.employeeIds && filter.employeeIds.length > 0) {
      list = list.filter((a) => filter.employeeIds!.includes(a.employeeId));
    }
    if (filter.status) list = list.filter((a) => a.status === filter.status);
    if (filter.advanceType) list = list.filter((a) => a.advanceType === filter.advanceType);
    return list;
  }

  async generateAdvanceId(): Promise<string> {
    this.advanceSeq += 1;
    const year = new Date().getFullYear();
    return `ADV-${year}-${String(this.advanceSeq).padStart(3, '0')}`;
  }
}
