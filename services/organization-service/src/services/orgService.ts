import { IOrganizationRepository, CompanyProfileRecord, BranchRecord, DepartmentRecord, DesignationRecord } from '../repositories/orgRepository';
import { NotFoundError, ConflictError } from '../../../../shared/src/errors/AppError';

export class OrganizationService {
  constructor(private orgRepo: IOrganizationRepository) {}

  async getCompanyProfile(): Promise<CompanyProfileRecord> {
    const profile = await this.orgRepo.getCompanyProfile();
    if (!profile) {
      throw new NotFoundError('Company profile has not been configured');
    }
    return profile;
  }

  async updateCompanyProfile(data: Partial<CompanyProfileRecord>): Promise<CompanyProfileRecord> {
    return this.orgRepo.saveCompanyProfile(data);
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

