"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
class OrganizationService {
    orgRepo;
    constructor(orgRepo) {
        this.orgRepo = orgRepo;
    }
    async getCompanyProfile() {
        const profile = await this.orgRepo.getCompanyProfile();
        if (!profile) {
            throw new AppError_1.NotFoundError('Company profile has not been configured');
        }
        return profile;
    }
    async updateCompanyProfile(data) {
        return this.orgRepo.saveCompanyProfile(data);
    }
    async getBranches() {
        return this.orgRepo.getBranches();
    }
    async createBranch(data) {
        const existing = await this.orgRepo.getBranchById(`BR-${data.code.toUpperCase()}`);
        if (existing) {
            throw new AppError_1.ConflictError(`Branch with code ${data.code} already exists`);
        }
        return this.orgRepo.createBranch({ ...data, status: 'Active' });
    }
    async getDepartments() {
        return this.orgRepo.getDepartments();
    }
    async createDepartment(data) {
        const existing = await this.orgRepo.getDepartmentById(`DEP-${data.code.toUpperCase()}`);
        if (existing) {
            throw new AppError_1.ConflictError(`Department with code ${data.code} already exists`);
        }
        return this.orgRepo.createDepartment({ ...data, status: 'Active' });
    }
    async getDesignations() {
        return this.orgRepo.getDesignations();
    }
    async createDesignation(data) {
        const existing = await this.orgRepo.getDesignationByCode(data.code);
        if (existing) {
            throw new AppError_1.ConflictError(`Designation with code ${data.code} already exists`);
        }
        return this.orgRepo.createDesignation({ ...data, status: 'Active' });
    }
    /**
     * Preserves standard designation code logic for employee ID generation
     * Formats: EMP-[DESIGNATION CODE]-[SEQ] (e.g. EMP-SWE-0001, EMP-MD-0002)
     */
    async deriveDesignationCode(designationId) {
        if (!designationId)
            return 'GEN';
        const desig = await this.orgRepo.getDesignationById(designationId);
        if (desig && desig.code) {
            return desig.code.split('-')[0].replace(/[^A-Za-z]/g, '').toUpperCase() || 'GEN';
        }
        return 'GEN';
    }
}
exports.OrganizationService = OrganizationService;
