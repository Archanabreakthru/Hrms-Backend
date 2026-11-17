export interface EmployeeRecord {
  id: string;
  originalLegacyId?: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  personalEmail?: string;
  personalPhone?: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  address?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  departmentId?: string;
  designationId?: string;
  branchId?: string;
  employmentType: 'Permanent' | 'Contract' | 'Probation' | 'Intern';
  status: 'Active' | 'On_Leave' | 'Probation' | 'Notice_Period' | 'Separated' | 'Inactive';
  profileStatus: 'Draft' | 'Profile_Incomplete' | 'Pending_Verification' | 'Active' | 'Inactive' | 'Separated';
  dateOfJoining?: Date;
  probationPeriodDays?: number;
  probationEndDate?: Date;
  confirmationDate?: Date;
  noticePeriodDays: number;
  dateOfSeparation?: Date;
  separationReason?: string;
  reportingManagerId?: string;
  shiftId?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName?: string;
  };
  panOrTaxNumber?: string;
  pfUan?: string;
  esiNumber?: string;
  epfApplicable: boolean;
  epfWageCeilingApplied: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  tdsRatePercent?: number;
  baseSalaryAnnual?: number;
  salaryStructureId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRecordEntry {
  id: string;
  employeeId: string;
  recordType: string;
  effectiveDate: Date;
  previousDesignationId?: string | null;
  newDesignationId?: string | null;
  previousDepartmentId?: string | null;
  newDepartmentId?: string | null;
  previousReportingManagerId?: string | null;
  newReportingManagerId?: string | null;
  previousBranchId?: string | null;
  newBranchId?: string | null;
  previousEmploymentType?: string | null;
  newEmploymentType?: string | null;
  previousSalaryAmount?: number | null;
  newSalaryAmount?: number | null;
  notes?: string | null;
  approvalStatus: string;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeRepository {
  findById(id: string): Promise<EmployeeRecord | null>;
  findByEmail(email: string): Promise<EmployeeRecord | null>;
  findByUserId(userId: string): Promise<EmployeeRecord | null>;
  findByPan(pan: string): Promise<EmployeeRecord | null>;
  list(filter?: {
    departmentId?: string;
    branchId?: string;
    status?: string;
    profileStatus?: string;
    reportingManagerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ employees: EmployeeRecord[]; total: number }>;
  
  create(employee: EmployeeRecord): Promise<EmployeeRecord>;
  createWithOutbox?(employee: EmployeeRecord, outboxPayload: any): Promise<EmployeeRecord>;
  update(id: string, updates: Partial<EmployeeRecord>): Promise<EmployeeRecord>;
  allocateNextId(designationCode: string): Promise<string>;
  getDirectReports(managerId: string): Promise<EmployeeRecord[]>;

  // Service Records
  getServiceRecords(employeeId: string): Promise<ServiceRecordEntry[]>;
  createServiceRecord(record: Omit<ServiceRecordEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRecordEntry>;
  updateServiceRecordStatus(recordId: string, status: string, approvedBy?: string): Promise<ServiceRecordEntry>;
}

export class InMemoryEmployeeRepository implements IEmployeeRepository {
  private employees = new Map<string, EmployeeRecord>();
  private serviceRecords = new Map<string, ServiceRecordEntry>();
  private sequences = new Map<string, number>();
  // Mutex lock per designation code for concurrency-safe allocation
  private sequenceLocks = new Map<string, Promise<void>>();

  async findById(id: string): Promise<EmployeeRecord | null> {
    return this.employees.get(id) || null;
  }

  async findByEmail(email: string): Promise<EmployeeRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const emp of this.employees.values()) {
      if (emp.email.toLowerCase() === normalized) return emp;
    }
    return null;
  }

  async findByUserId(userId: string): Promise<EmployeeRecord | null> {
    for (const emp of this.employees.values()) {
      if (emp.userId === userId) return emp;
    }
    return null;
  }

  async findByPan(pan: string): Promise<EmployeeRecord | null> {
    const normalized = pan.toUpperCase().trim();
    for (const emp of this.employees.values()) {
      if (emp.panOrTaxNumber?.toUpperCase() === normalized) return emp;
    }
    return null;
  }

  async list(filter?: {
    departmentId?: string;
    branchId?: string;
    status?: string;
    profileStatus?: string;
    reportingManagerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ employees: EmployeeRecord[]; total: number }> {
    let list = Array.from(this.employees.values());

    if (filter?.departmentId) list = list.filter((e) => e.departmentId === filter.departmentId);
    if (filter?.branchId) list = list.filter((e) => e.branchId === filter.branchId);
    if (filter?.status) list = list.filter((e) => e.status === filter.status);
    if (filter?.profileStatus) list = list.filter((e) => e.profileStatus === filter.profileStatus);
    if (filter?.reportingManagerId) list = list.filter((e) => e.reportingManagerId === filter.reportingManagerId);
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const page = filter?.page || 1;
    const limit = filter?.limit || 50;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return { employees: paginated, total };
  }

  async create(employee: EmployeeRecord): Promise<EmployeeRecord> {
    this.employees.set(employee.id, { ...employee });
    return employee;
  }

  async update(id: string, updates: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const existing = this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);

    const updated: EmployeeRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.employees.set(id, updated);
    return updated;
  }

  async allocateNextId(designationCode: string): Promise<string> {
    const code = designationCode.toUpperCase().trim() || 'GEN';

    // Acquire lock for this prefix
    let unlock: () => void = () => {};
    const currentLock = this.sequenceLocks.get(code) || Promise.resolve();
    const nextLock = new Promise<void>((resolve) => {
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
            if (!isNaN(num) && num > max) max = num;
          }
          const legacyMatch = emp.id.match(/^EMP-(\d+)$/i);
          if (legacyMatch) {
            const num = parseInt(legacyMatch[1], 10);
            if (!isNaN(num) && num > max) max = num;
          }
        }
        currentSeq = max;
      }
      currentSeq += 1;
      this.sequences.set(code, currentSeq);
      return `EMP-${code}-${String(currentSeq).padStart(4, '0')}`;
    } finally {
      unlock();
    }
  }

  async getDirectReports(managerId: string): Promise<EmployeeRecord[]> {
    return Array.from(this.employees.values()).filter((e) => e.reportingManagerId === managerId);
  }

  async getServiceRecords(employeeId: string): Promise<ServiceRecordEntry[]> {
    return Array.from(this.serviceRecords.values())
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  }

  async createServiceRecord(
    record: Omit<ServiceRecordEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceRecordEntry> {
    const id = `sr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const newEntry: ServiceRecordEntry = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.serviceRecords.set(id, newEntry);
    return newEntry;
  }

  async updateServiceRecordStatus(
    recordId: string,
    status: string,
    approvedBy?: string
  ): Promise<ServiceRecordEntry> {
    const existing = this.serviceRecords.get(recordId);
    if (!existing) throw new Error(`Service record ${recordId} not found`);
    const updated: ServiceRecordEntry = {
      ...existing,
      approvalStatus: status,
      approvedBy: approvedBy || existing.approvedBy,
      approvedAt: status === 'Approved' ? new Date() : existing.approvedAt,
      updatedAt: new Date(),
    };
    this.serviceRecords.set(recordId, updated);
    return updated;
  }
}

