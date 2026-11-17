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
            throw new AppError_1.NotFoundError('Company profile has not been configured', { code: 'PROFILE_NOT_CONFIGURED' });
        }
        return profile;
    }
    async updateCompanyProfile(data) {
        return this.orgRepo.saveCompanyProfile(data);
    }
    async getStatutoryConfig() {
        const config = await this.orgRepo.getStatutoryConfig();
        if (!config) {
            // Default initial configuration if not yet persisted
            const now = new Date('2026-04-01');
            return {
                id: 'stat-default',
                companyId: '00000000-0000-0000-0000-000000000000',
                epfApplicable: true,
                epfEmployeeRatePercent: 12,
                epfEmployerRatePercent: 12,
                epfWageCeilingMonthly: 15000,
                epfRestrictToWageCeiling: false,
                epfEffectiveFrom: now,
                esiApplicable: true,
                esiGrossThresholdMonthly: 21000,
                esiEmployeeRatePercent: 0.75,
                esiEmployerRatePercent: 3.25,
                esiEffectiveFrom: now,
                ptApplicable: true,
                ptStateJurisdiction: 'Karnataka',
                ptMonthlySlabAmount: 200,
                ptMinGrossThreshold: 15000,
                ptEffectiveFrom: now,
                tdsApplicable: true,
                tdsFinancialYear: 'FY 2026-27',
                tdsDefaultRegime: 'New Regime (FY 2026-27)',
                tdsEffectiveFrom: now,
                createdAt: now,
                updatedAt: now,
            };
        }
        return config;
    }
    async updateStatutoryConfig(data) {
        return this.orgRepo.saveStatutoryConfig(data);
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
    async updateBranch(id, patch) {
        const existing = await this.orgRepo.getBranchById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Branch ${id} not found`);
        }
        return this.orgRepo.updateBranch(id, patch);
    }
    async toggleBranchStatus(id, isActive) {
        const existing = await this.orgRepo.getBranchById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Branch ${id} not found`);
        }
        return this.orgRepo.updateBranch(id, { status: isActive ? 'Active' : 'Inactive' });
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
    async updateDepartment(id, patch) {
        const existing = await this.orgRepo.getDepartmentById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Department ${id} not found`);
        }
        return this.orgRepo.updateDepartment(id, patch);
    }
    async toggleDepartmentStatus(id, isActive) {
        const existing = await this.orgRepo.getDepartmentById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Department ${id} not found`);
        }
        return this.orgRepo.updateDepartment(id, { status: isActive ? 'Active' : 'Inactive' });
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
    async updateDesignation(id, patch) {
        const existing = await this.orgRepo.getDesignationById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Designation ${id} not found`);
        }
        return this.orgRepo.updateDesignation(id, patch);
    }
    async toggleDesignationStatus(id, isActive) {
        const existing = await this.orgRepo.getDesignationById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Designation ${id} not found`);
        }
        return this.orgRepo.updateDesignation(id, { status: isActive ? 'Active' : 'Inactive' });
    }
    async deleteBranch(id) {
        const existing = await this.orgRepo.getBranchById(id);
        if (!existing)
            throw new AppError_1.NotFoundError(`Branch ${id} not found`);
        return this.orgRepo.deleteBranch(id);
    }
    async deleteDepartment(id) {
        const existing = await this.orgRepo.getDepartmentById(id);
        if (!existing)
            throw new AppError_1.NotFoundError(`Department ${id} not found`);
        return this.orgRepo.deleteDepartment(id);
    }
    async deleteDesignation(id) {
        const existing = await this.orgRepo.getDesignationById(id);
        if (!existing)
            throw new AppError_1.NotFoundError(`Designation ${id} not found`);
        return this.orgRepo.deleteDesignation(id);
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
