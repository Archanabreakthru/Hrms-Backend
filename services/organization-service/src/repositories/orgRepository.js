"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryOrganizationRepository = void 0;
class InMemoryOrganizationRepository {
    companyProfile = null;
    branches = new Map();
    departments = new Map();
    designations = new Map();
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        const now = new Date();
        this.companyProfile = {
            id: 'org-profile-001',
            legalName: 'Orbyx Technologies Private Limited',
            tradingName: 'Orbyx Technologies',
            cinNumber: 'U72200KA2020PTC134567',
            panNumber: 'AABCO1234F',
            tanNumber: 'BLRO12345E',
            gstin: '29AABCO1234F1Z5',
            pfRegistrationNumber: 'KN/BLR/0012345/000',
            esiRegistrationNumber: '53000123450000001',
            registeredAddress: 'Prestige Tech Park, Marathahalli, Bangalore, KA - 560103',
            headquartersAddress: 'Prestige Tech Park, Marathahalli, Bangalore, KA - 560103',
            contactEmail: 'contact@orbyx.io',
            contactPhone: '+91 80 4112 7300',
            website: 'https://orbyx.io',
            createdAt: now,
            updatedAt: now,
        };
        const b1 = {
            id: 'BR-BLR',
            code: 'BLR',
            name: 'Bangalore Headquarters',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            address: 'Prestige Tech Park, Bangalore',
            isHeadquarters: true,
            status: 'Active',
            createdAt: now,
            updatedAt: now,
        };
        this.branches.set(b1.id, b1);
        const d1 = {
            id: 'DEP-ENG',
            code: 'ENG',
            name: 'Engineering',
            branchId: 'BR-BLR',
            status: 'Active',
            createdAt: now,
            updatedAt: now,
        };
        const d2 = {
            id: 'DEP-HR',
            code: 'HR',
            name: 'Human Resources',
            branchId: 'BR-BLR',
            status: 'Active',
            createdAt: now,
            updatedAt: now,
        };
        this.departments.set(d1.id, d1);
        this.departments.set(d2.id, d2);
        const desigs = [
            { id: 'DES-SWE', code: 'SWE', title: 'Software Engineer', departmentId: 'DEP-ENG', level: 2, status: 'Active', createdAt: now, updatedAt: now },
            { id: 'DES-MD', code: 'MD', title: 'Managing Director', level: 10, status: 'Active', createdAt: now, updatedAt: now },
            { id: 'DES-HRM', code: 'HRM', title: 'HR Manager', departmentId: 'DEP-HR', level: 5, status: 'Active', createdAt: now, updatedAt: now },
        ];
        desigs.forEach((d) => this.designations.set(d.id, d));
    }
    async getCompanyProfile() {
        return this.companyProfile;
    }
    async saveCompanyProfile(profile) {
        const now = new Date();
        if (!this.companyProfile) {
            this.companyProfile = {
                id: 'org-profile-001',
                legalName: profile.legalName || 'Orbyx Technologies',
                tradingName: profile.tradingName || 'Orbyx',
                registeredAddress: profile.registeredAddress || '',
                headquartersAddress: profile.headquartersAddress || '',
                contactEmail: profile.contactEmail || 'admin@orbyx.io',
                contactPhone: profile.contactPhone || '',
                createdAt: now,
                updatedAt: now,
                ...profile,
            };
        }
        else {
            this.companyProfile = {
                ...this.companyProfile,
                ...profile,
                updatedAt: now,
            };
        }
        return this.companyProfile;
    }
    async getBranches() {
        return Array.from(this.branches.values());
    }
    async getBranchById(id) {
        return this.branches.get(id) || null;
    }
    async createBranch(branchData) {
        const id = `BR-${branchData.code.toUpperCase()}`;
        const now = new Date();
        const branch = { ...branchData, id, createdAt: now, updatedAt: now };
        this.branches.set(id, branch);
        return branch;
    }
    async getDepartments() {
        return Array.from(this.departments.values());
    }
    async getDepartmentById(id) {
        return this.departments.get(id) || null;
    }
    async createDepartment(deptData) {
        const id = `DEP-${deptData.code.toUpperCase()}`;
        const now = new Date();
        const dept = { ...deptData, id, createdAt: now, updatedAt: now };
        this.departments.set(id, dept);
        return dept;
    }
    async getDesignations() {
        return Array.from(this.designations.values());
    }
    async getDesignationById(id) {
        return this.designations.get(id) || null;
    }
    async getDesignationByCode(code) {
        const normalized = code.toUpperCase().trim();
        for (const d of this.designations.values()) {
            if (d.code === normalized)
                return d;
        }
        return null;
    }
    async createDesignation(desigData) {
        const id = `DES-${desigData.code.toUpperCase()}`;
        const now = new Date();
        const desig = { ...desigData, id, createdAt: now, updatedAt: now };
        this.designations.set(id, desig);
        return desig;
    }
}
exports.InMemoryOrganizationRepository = InMemoryOrganizationRepository;
