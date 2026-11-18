import {
  IOrganizationRepository,
  CompanyProfileRecord,
  StatutoryConfigRecord,
  BranchRecord,
  DepartmentRecord,
  DesignationRecord,
} from '../repositories/orgRepository';
import { NotFoundError, ConflictError } from '../../../../shared/src/errors/AppError';

export class OrganizationService {
  constructor(private orgRepo: IOrganizationRepository) {}

  async getCompanyProfile(): Promise<CompanyProfileRecord> {
    const profile = await this.orgRepo.getCompanyProfile();
    if (!profile) {
      throw new NotFoundError('Company profile has not been configured', { code: 'PROFILE_NOT_CONFIGURED' });
    }
    return profile;
  }

  async updateCompanyProfile(data: Partial<CompanyProfileRecord>): Promise<CompanyProfileRecord> {
    return this.orgRepo.saveCompanyProfile(data);
  }

  async getStatutoryConfig(): Promise<StatutoryConfigRecord> {
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

  async updateStatutoryConfig(data: Partial<StatutoryConfigRecord>): Promise<StatutoryConfigRecord> {
    return this.orgRepo.saveStatutoryConfig(data);
  }

  async getBranches(): Promise<BranchRecord[]> {
    return this.orgRepo.getBranches();
  }

  async createBranch(data: Omit<BranchRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<BranchRecord> {
    const existing = await this.orgRepo.getBranchById(`BR-${data.code.toUpperCase()}`);
    if (existing) {
      throw new ConflictError(`Branch with code ${data.code} already exists`);
    }
    return this.orgRepo.createBranch({ ...data, status: 'Active' });
  }

  async updateBranch(id: string, patch: Partial<BranchRecord>): Promise<BranchRecord> {
    const existing = await this.orgRepo.getBranchById(id);
    if (!existing) {
      throw new NotFoundError(`Branch ${id} not found`);
    }
    return this.orgRepo.updateBranch(id, patch);
  }

  async toggleBranchStatus(id: string, isActive: boolean): Promise<BranchRecord> {
    const existing = await this.orgRepo.getBranchById(id);
    if (!existing) {
      throw new NotFoundError(`Branch ${id} not found`);
    }
    return this.orgRepo.updateBranch(id, { status: isActive ? 'Active' : 'Inactive' });
  }

  async getDepartments(): Promise<DepartmentRecord[]> {
    return this.orgRepo.getDepartments();
  }

  async createDepartment(data: Omit<DepartmentRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<DepartmentRecord> {
    const existing = await this.orgRepo.getDepartmentById(`DEP-${data.code.toUpperCase()}`);
    if (existing) {
      throw new ConflictError(`Department with code ${data.code} already exists`);
    }
    return this.orgRepo.createDepartment({ ...data, status: 'Active' });
  }

  async updateDepartment(id: string, patch: Partial<DepartmentRecord>): Promise<DepartmentRecord> {
    const existing = await this.orgRepo.getDepartmentById(id);
    if (!existing) {
      throw new NotFoundError(`Department ${id} not found`);
    }
    return this.orgRepo.updateDepartment(id, patch);
  }

  async toggleDepartmentStatus(id: string, isActive: boolean): Promise<DepartmentRecord> {
    const existing = await this.orgRepo.getDepartmentById(id);
    if (!existing) {
      throw new NotFoundError(`Department ${id} not found`);
    }
    return this.orgRepo.updateDepartment(id, { status: isActive ? 'Active' : 'Inactive' });
  }

  async getDesignations(): Promise<DesignationRecord[]> {
    return this.orgRepo.getDesignations();
  }

  async createDesignation(data: Omit<DesignationRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<DesignationRecord> {
    const existing = await this.orgRepo.getDesignationByCode(data.code);
    if (existing) {
      throw new ConflictError(`Designation with code ${data.code} already exists`);
    }
    return this.orgRepo.createDesignation({ ...data, status: 'Active' });
  }

  async updateDesignation(id: string, patch: Partial<DesignationRecord>): Promise<DesignationRecord> {
    const existing = await this.orgRepo.getDesignationById(id);
    if (!existing) {
      throw new NotFoundError(`Designation ${id} not found`);
    }
    return this.orgRepo.updateDesignation(id, patch);
  }

  async toggleDesignationStatus(id: string, isActive: boolean): Promise<DesignationRecord> {
    const existing = await this.orgRepo.getDesignationById(id);
    if (!existing) {
      throw new NotFoundError(`Designation ${id} not found`);
    }
    return this.orgRepo.updateDesignation(id, { status: isActive ? 'Active' : 'Inactive' });
  }

  async deleteBranch(id: string): Promise<boolean> {
    const existing = await this.orgRepo.getBranchById(id);
    if (!existing) throw new NotFoundError(`Branch ${id} not found`);
    return this.orgRepo.deleteBranch(id);
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const existing = await this.orgRepo.getDepartmentById(id);
    if (!existing) throw new NotFoundError(`Department ${id} not found`);
    return this.orgRepo.deleteDepartment(id);
  }

  async deleteDesignation(id: string): Promise<boolean> {
    const existing = await this.orgRepo.getDesignationById(id);
    if (!existing) throw new NotFoundError(`Designation ${id} not found`);
    return this.orgRepo.deleteDesignation(id);
  }

  /**
   * Preserves standard designation code logic for employee ID generation
   * Formats: EMP-[DESIGNATION CODE]-[SEQ] (e.g. EMP-SWE-0001, EMP-MD-0002)
   */
  async deriveDesignationCode(designationId?: string): Promise<string> {
    if (!designationId) return 'GEN';
    const desig = await this.orgRepo.getDesignationById(designationId);
    if (desig && desig.code) {
      return desig.code.split('-')[0].replace(/[^A-Za-z]/g, '').toUpperCase() || 'GEN';
    }
    return 'GEN';
  }
}

