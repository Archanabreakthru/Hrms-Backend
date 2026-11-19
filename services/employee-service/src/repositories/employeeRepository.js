"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEmployeeRepository = void 0;
class InMemoryEmployeeRepository {
    employees = new Map();
    serviceRecords = new Map();
    documents = new Map();
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
        if (filter?.search) {
            const q = filter.search.toLowerCase().trim();
            list = list.filter((e) => e.firstName.toLowerCase().includes(q) ||
                e.lastName.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q) ||
                e.id.toLowerCase().includes(q));
        }
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
    async getServiceRecords(employeeId) {
        return Array.from(this.serviceRecords.values())
            .filter((r) => r.employeeId === employeeId)
            .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
    }
    async createServiceRecord(record) {
        const id = `sr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const now = new Date();
        const newEntry = {
            ...record,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.serviceRecords.set(id, newEntry);
        return newEntry;
    }
    async updateServiceRecordStatus(recordId, status, approvedBy) {
        const existing = this.serviceRecords.get(recordId);
        if (!existing)
            throw new Error(`Service record ${recordId} not found`);
        const updated = {
            ...existing,
            approvalStatus: status,
            approvedBy: approvedBy || existing.approvedBy,
            approvedAt: status === 'Approved' ? new Date() : existing.approvedAt,
            updatedAt: new Date(),
        };
        this.serviceRecords.set(recordId, updated);
        return updated;
    }
    async getDocuments(employeeId) {
        const list = [];
        for (const doc of this.documents.values()) {
            if (doc.employeeId === employeeId)
                list.push(doc);
        }
        return list;
    }
    async createDocument(doc) {
        const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const now = new Date();
        const newDoc = {
            ...doc,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.documents.set(id, newDoc);
        return newDoc;
    }
    async deleteDocument(employeeId, docId) {
        const doc = this.documents.get(docId);
        if (!doc || doc.employeeId !== employeeId)
            return false;
        return this.documents.delete(docId);
    }
    async updateDocumentStatus(employeeId, docId, status, notes, verifiedBy) {
        const existing = this.documents.get(docId);
        if (!existing || existing.employeeId !== employeeId)
            throw new Error(`Document ${docId} not found`);
        const updated = {
            ...existing,
            verificationStatus: status,
            notes: notes !== undefined ? notes : existing.notes,
            verifiedBy: verifiedBy || existing.verifiedBy,
            verifiedAt: status === 'Verified' ? new Date() : existing.verifiedAt,
            updatedAt: new Date(),
        };
        this.documents.set(docId, updated);
        return updated;
    }
}
exports.InMemoryEmployeeRepository = InMemoryEmployeeRepository;
