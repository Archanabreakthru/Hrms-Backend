"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryExpenseRepository = void 0;
class InMemoryExpenseRepository {
    categories = new Map();
    claims = new Map();
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        const c1 = { id: 'CAT-TRAVEL', code: 'TRAVEL', name: 'Travel & Commute', policyLimitMax: 10000, requiresReceipt: true, status: 'Active' };
        const c2 = { id: 'CAT-FOOD', code: 'FOOD', name: 'Client Meal / Food', policyLimitMax: 2000, requiresReceipt: true, status: 'Active' };
        this.categories.set(c1.id, c1);
        this.categories.set(c2.id, c2);
    }
    async findCategory(id) {
        return this.categories.get(id) || null;
    }
    async listCategories() {
        return Array.from(this.categories.values());
    }
    async saveCategory(cat) {
        this.categories.set(cat.id, { ...cat });
        return cat;
    }
    async findClaim(id) {
        return this.claims.get(id) || null;
    }
    async saveClaim(claim) {
        this.claims.set(claim.id, { ...claim });
        return claim;
    }
    async listClaims(filter) {
        let list = Array.from(this.claims.values());
        if (filter.employeeId)
            list = list.filter((c) => c.employeeId === filter.employeeId);
        if (filter.status)
            list = list.filter((c) => c.status === filter.status);
        return list;
    }
}
exports.InMemoryExpenseRepository = InMemoryExpenseRepository;
