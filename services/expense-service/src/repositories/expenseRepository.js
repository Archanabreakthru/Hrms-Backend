"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryExpenseRepository = void 0;
class InMemoryExpenseRepository {
    categories = new Map();
    claims = new Map();
    advances = new Map();
    claimSeq = 1000;
    advanceSeq = 100;
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        const c1 = {
            id: 'CAT-TRAVEL',
            code: 'TRAVEL',
            name: 'Travel & Commute',
            policyLimitMax: 10000,
            requiresReceipt: true,
            status: 'Active',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const c2 = {
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
    async findCategory(id) {
        return this.categories.get(id) || null;
    }
    async findCategoryByCode(code) {
        for (const cat of this.categories.values()) {
            if (cat.code.toUpperCase() === code.toUpperCase())
                return cat;
        }
        return null;
    }
    async listCategories(activeOnly = true) {
        const list = Array.from(this.categories.values());
        if (activeOnly)
            return list.filter((c) => c.status === 'Active');
        return list;
    }
    async saveCategory(cat) {
        const id = cat.id || `CAT-${Date.now()}`;
        const full = {
            ...cat,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.categories.set(id, full);
        return full;
    }
    async findClaim(id) {
        return this.claims.get(id) || null;
    }
    async findClaimByNumber(claimNumber) {
        for (const c of this.claims.values()) {
            if (c.claimNumber === claimNumber)
                return c;
        }
        return null;
    }
    async saveClaim(claim) {
        const id = claim.id || `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const full = {
            ...claim,
            id,
            createdAt: claim.createdAt || new Date(),
            updatedAt: claim.updatedAt || new Date(),
        };
        this.claims.set(id, full);
        return full;
    }
    async updateClaim(id, updates) {
        const existing = this.claims.get(id);
        if (!existing)
            throw new Error(`Claim ${id} not found`);
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.claims.set(id, updated);
        return updated;
    }
    async transitionClaimStatus(id, expectedCurrentStatus, updates) {
        const existing = this.claims.get(id);
        if (!existing)
            return { count: 0 };
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
    async listClaims(filter) {
        let list = Array.from(this.claims.values());
        if (filter.employeeId)
            list = list.filter((c) => c.employeeId === filter.employeeId);
        if (filter.employeeIds && filter.employeeIds.length > 0) {
            list = list.filter((c) => filter.employeeIds.includes(c.employeeId));
        }
        if (filter.status)
            list = list.filter((c) => c.status === filter.status);
        if (filter.categoryId)
            list = list.filter((c) => c.categoryId === filter.categoryId);
        return list;
    }
    async generateClaimNumber() {
        this.claimSeq += 1;
        const year = new Date().getFullYear();
        return `EXP-${year}-${String(this.claimSeq).padStart(5, '0')}`;
    }
    async findAdvance(id) {
        return this.advances.get(id) || null;
    }
    async saveAdvance(adv) {
        this.advances.set(adv.id, { ...adv });
        return adv;
    }
    async updateAdvance(id, updates) {
        const existing = this.advances.get(id);
        if (!existing)
            throw new Error(`Advance ${id} not found`);
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.advances.set(id, updated);
        return updated;
    }
    async transitionAdvanceStatus(id, expectedCurrentStatus, updates) {
        const existing = this.advances.get(id);
        if (!existing)
            return { count: 0 };
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
    async listAdvances(filter) {
        let list = Array.from(this.advances.values());
        if (filter.employeeId)
            list = list.filter((a) => a.employeeId === filter.employeeId);
        if (filter.employeeIds && filter.employeeIds.length > 0) {
            list = list.filter((a) => filter.employeeIds.includes(a.employeeId));
        }
        if (filter.status)
            list = list.filter((a) => a.status === filter.status);
        if (filter.advanceType)
            list = list.filter((a) => a.advanceType === filter.advanceType);
        return list;
    }
    async generateAdvanceId() {
        this.advanceSeq += 1;
        const year = new Date().getFullYear();
        return `ADV-${year}-${String(this.advanceSeq).padStart(3, '0')}`;
    }
}
exports.InMemoryExpenseRepository = InMemoryExpenseRepository;
