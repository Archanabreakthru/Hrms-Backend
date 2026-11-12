"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEmployeeRepository = void 0;
class InMemoryEmployeeRepository {
    employees = new Map();
    sequences = new Map();
    // Mutex lock per designation code for concurrency-safe allocation
    sequenceLocks = new Map();
    async findById(id) {
        return this.employees.get(id) || null;
    }
    async findByEmail(email) {
        const normalized = email.toLowerCase().trim();
        for (const emp of this.employees.values()) {
            if (emp.email.toLowerCase() === normalized)
                return emp;
        }
        return null;
    }
    async findByUserId(userId) {
        for (const emp of this.employees.values()) {
            if (emp.userId === userId)
                return emp;
        }
        return null;
    }
    async findByPan(pan) {
        const normalized = pan.toUpperCase().trim();
        for (const emp of this.employees.values()) {
            if (emp.panOrTaxNumber?.toUpperCase() === normalized)
                return emp;
        }
        return null;
    }
    async list(filter) {
        let list = Array.from(this.employees.values());
        if (filter?.departmentId)
            list = list.filter((e) => e.departmentId === filter.departmentId);
        if (filter?.branchId)
            list = list.filter((e) => e.branchId === filter.branchId);
        if (filter?.status)
            list = list.filter((e) => e.status === filter.status);
        if (filter?.profileStatus)
            list = list.filter((e) => e.profileStatus === filter.profileStatus);
        if (filter?.reportingManagerId)
            list = list.filter((e) => e.reportingManagerId === filter.reportingManagerId);
        const total = list.length;
        const page = filter?.page || 1;
        const limit = filter?.limit || 50;
        const startIndex = (page - 1) * limit;
        const paginated = list.slice(startIndex, startIndex + limit);
        return { employees: paginated, total };
    }
    async create(employee) {
        this.employees.set(employee.id, { ...employee });
        return employee;
    }
    async update(id, updates) {
        const existing = this.employees.get(id);
        if (!existing)
            throw new Error(`Employee ${id} not found`);
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
        };
        this.employees.set(id, updated);
        return updated;
    }
    async allocateNextId(designationCode) {
        const code = designationCode.toUpperCase().trim() || 'GEN';
        // Acquire lock for this prefix
        let unlock = () => { };
        const currentLock = this.sequenceLocks.get(code) || Promise.resolve();
        const nextLock = new Promise((resolve) => {
            unlock = resolve;
        });
        this.sequenceLocks.set(code, currentLock.then(() => nextLock));
        await currentLock;
        try {
            let currentSeq = this.sequences.get(code);
            if (currentSeq === undefined) {
                // Compute highest sequence in memory
                let max = 0;
                for (const emp of this.employees.values()) {
                    const match = emp.id.match(/^EMP-[A-Z]+-(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > max)
                            max = num;
                    }
                    const legacyMatch = emp.id.match(/^EMP-(\d+)$/i);
                    if (legacyMatch) {
                        const num = parseInt(legacyMatch[1], 10);
                        if (!isNaN(num) && num > max)
                            max = num;
                    }
                }
                currentSeq = max;
            }
            currentSeq += 1;
            this.sequences.set(code, currentSeq);
            return `EMP-${code}-${String(currentSeq).padStart(4, '0')}`;
        }
        finally {
            unlock();
        }
    }
    async getDirectReports(managerId) {
        return Array.from(this.employees.values()).filter((e) => e.reportingManagerId === managerId);
    }
}
exports.InMemoryEmployeeRepository = InMemoryEmployeeRepository;
