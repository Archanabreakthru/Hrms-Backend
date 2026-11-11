export interface ExpenseCategoryDTO {
  id: string;
  code: string;
  name: string;
  policyLimitMax: number;
  requiresReceipt: boolean;
  status: string;
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
  receiptUrl?: string;
  status: 'Draft' | 'Submitted' | 'Approved_By_Manager' | 'Approved_By_HR' | 'Rejected' | 'Reimbursed';
  managerId?: string;
  managerRemarks?: string;
  managerActionAt?: string;
  hrAdminId?: string;
  hrRemarks?: string;
  hrActionAt?: string;
  reimbursedAt?: string;
  isPettyCash: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpenseRepository {
  findCategory(id: string): Promise<ExpenseCategoryDTO | null>;
  listCategories(): Promise<ExpenseCategoryDTO[]>;
  saveCategory(cat: ExpenseCategoryDTO): Promise<ExpenseCategoryDTO>;

  findClaim(id: string): Promise<ExpenseClaimDTO | null>;
  saveClaim(claim: ExpenseClaimDTO): Promise<ExpenseClaimDTO>;
  listClaims(filter: { employeeId?: string; status?: string }): Promise<ExpenseClaimDTO[]>;
}

export class InMemoryExpenseRepository implements IExpenseRepository {
  private categories = new Map<string, ExpenseCategoryDTO>();
  private claims = new Map<string, ExpenseClaimDTO>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const c1: ExpenseCategoryDTO = { id: 'CAT-TRAVEL', code: 'TRAVEL', name: 'Travel & Commute', policyLimitMax: 10000, requiresReceipt: true, status: 'Active' };
    const c2: ExpenseCategoryDTO = { id: 'CAT-FOOD', code: 'FOOD', name: 'Client Meal / Food', policyLimitMax: 2000, requiresReceipt: true, status: 'Active' };
    this.categories.set(c1.id, c1);
    this.categories.set(c2.id, c2);
  }

  async findCategory(id: string): Promise<ExpenseCategoryDTO | null> {
    return this.categories.get(id) || null;
  }

  async listCategories(): Promise<ExpenseCategoryDTO[]> {
    return Array.from(this.categories.values());
  }

  async saveCategory(cat: ExpenseCategoryDTO): Promise<ExpenseCategoryDTO> {
    this.categories.set(cat.id, { ...cat });
    return cat;
  }

  async findClaim(id: string): Promise<ExpenseClaimDTO | null> {
    return this.claims.get(id) || null;
  }

  async saveClaim(claim: ExpenseClaimDTO): Promise<ExpenseClaimDTO> {
    this.claims.set(claim.id, { ...claim });
    return claim;
  }

  async listClaims(filter: { employeeId?: string; status?: string }): Promise<ExpenseClaimDTO[]> {
    let list = Array.from(this.claims.values());
    if (filter.employeeId) list = list.filter((c) => c.employeeId === filter.employeeId);
    if (filter.status) list = list.filter((c) => c.status === filter.status);
    return list;
  }
}

