export interface CompanyProfileRecord {
  id: string;
  legalName: string;
  tradingName: string;
  cinNumber?: string;
  panNumber?: string;
  tanNumber?: string;
  gstin?: string;
  pfRegistrationNumber?: string;
  esiRegistrationNumber?: string;
  registeredAddress: string;
  headquartersAddress: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  country: string;
  address: string;
  isHeadquarters: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  branchId?: string;
  parentDeptId?: string;
  headEmployeeId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignationRecord {
  id: string;
  code: string; // e.g. SWE, MD, HRM
  title: string;
  departmentId?: string;
  level: number;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationRepository {
  getCompanyProfile(): Promise<CompanyProfileRecord | null>;
  saveCompanyProfile(profile: Partial<CompanyProfileRecord>): Promise<CompanyProfileRecord>;

  getBranches(): Promise<BranchRecord[]>;
  getBranchById(id: string): Promise<BranchRecord | null>;
  createBranch(branch: Omit<BranchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BranchRecord>;

  getDepartments(): Promise<DepartmentRecord[]>;
  getDepartmentById(id: string): Promise<DepartmentRecord | null>;
  createDepartment(dept: Omit<DepartmentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DepartmentRecord>;

  getDesignations(): Promise<DesignationRecord[]>;
  getDesignationById(id: string): Promise<DesignationRecord | null>;
  getDesignationByCode(code: string): Promise<DesignationRecord | null>;
  createDesignation(desig: Omit<DesignationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DesignationRecord>;
}

export class InMemoryOrganizationRepository implements IOrganizationRepository {
  private companyProfile: CompanyProfileRecord | null = null;
  private branches = new Map<string, BranchRecord>();
  private departments = new Map<string, DepartmentRecord>();
  private designations = new Map<string, DesignationRecord>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
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

    const b1: BranchRecord = {
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

    const d1: DepartmentRecord = {
      id: 'DEP-ENG',
      code: 'ENG',
      name: 'Engineering',
      branchId: 'BR-BLR',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };
    const d2: DepartmentRecord = {
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

    const desigs: DesignationRecord[] = [
      { id: 'DES-SWE', code: 'SWE', title: 'Software Engineer', departmentId: 'DEP-ENG', level: 2, status: 'Active', createdAt: now, updatedAt: now },
      { id: 'DES-MD', code: 'MD', title: 'Managing Director', level: 10, status: 'Active', createdAt: now, updatedAt: now },
      { id: 'DES-HRM', code: 'HRM', title: 'HR Manager', departmentId: 'DEP-HR', level: 5, status: 'Active', createdAt: now, updatedAt: now },
    ];
    desigs.forEach((d) => this.designations.set(d.id, d));
  }

  async getCompanyProfile(): Promise<CompanyProfileRecord | null> {
    return this.companyProfile;
  }

  async saveCompanyProfile(profile: Partial<CompanyProfileRecord>): Promise<CompanyProfileRecord> {
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
      } as CompanyProfileRecord;
    } else {
      this.companyProfile = {
        ...this.companyProfile,
        ...profile,
        updatedAt: now,
      };
    }
    return this.companyProfile;
  }

  async getBranches(): Promise<BranchRecord[]> {
    return Array.from(this.branches.values());
  }

  async getBranchById(id: string): Promise<BranchRecord | null> {
    return this.branches.get(id) || null;
  }

  async createBranch(branchData: Omit<BranchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BranchRecord> {
    const id = `BR-${branchData.code.toUpperCase()}`;
    const now = new Date();
    const branch: BranchRecord = { ...branchData, id, createdAt: now, updatedAt: now };
    this.branches.set(id, branch);
    return branch;
  }

  async getDepartments(): Promise<DepartmentRecord[]> {
    return Array.from(this.departments.values());
  }

  async getDepartmentById(id: string): Promise<DepartmentRecord | null> {
    return this.departments.get(id) || null;
  }

  async createDepartment(deptData: Omit<DepartmentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DepartmentRecord> {
    const id = `DEP-${deptData.code.toUpperCase()}`;
    const now = new Date();
    const dept: DepartmentRecord = { ...deptData, id, createdAt: now, updatedAt: now };
    this.departments.set(id, dept);
    return dept;
  }

  async getDesignations(): Promise<DesignationRecord[]> {
    return Array.from(this.designations.values());
  }

  async getDesignationById(id: string): Promise<DesignationRecord | null> {
    return this.designations.get(id) || null;
  }

  async getDesignationByCode(code: string): Promise<DesignationRecord | null> {
    const normalized = code.toUpperCase().trim();
    for (const d of this.designations.values()) {
      if (d.code === normalized) return d;
    }
    return null;
  }

  async createDesignation(desigData: Omit<DesignationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DesignationRecord> {
    const id = `DES-${desigData.code.toUpperCase()}`;
    const now = new Date();
    const desig: DesignationRecord = { ...desigData, id, createdAt: now, updatedAt: now };
    this.designations.set(id, desig);
    return desig;
  }
}

