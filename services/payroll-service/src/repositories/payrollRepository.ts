export interface StatutorySettingDTO {
  id: string;
  financialYear: string;
  epfEmployeeRatePercent: number; // 12%
  epfEmployerRatePercent: number; // 12%
  epfWageCeilingMonthly: number;  // 15,000
  esiEmployeeRatePercent: number; // 0.75%
  esiEmployerRatePercent: number; // 3.25%
  esiWageCeilingMonthly: number;  // 21,000
  professionalTaxMonthly: number; // 200
  effectiveFrom: Date;
}

export interface SalaryStructureDTO {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  grossSalaryMonthly: number;
  baseSalaryAnnual: number;
  items: Array<{
    code: string;
    amountMonthly: number;
    type: 'Earning' | 'Deduction' | 'Employer_Contribution';
  }>;
  status: string;
}

export interface PayslipLineItemDTO {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  totalWorkingDays: number;
  daysPresent: number;
  lossOfPayDays: number;
  clientBillableHours: number;
  clientAllowance: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  otherAllowances: number;
  grossEarnings: number;
  epfEmployeeDeduction: number;
  esiEmployeeDeduction: number;
  professionalTaxDeduction: number;
  tdsDeduction: number;
  lopDeduction: number;
  totalDeductions: number;
  netPayable: number;
  epfEmployerContribution: number;
  esiEmployerContribution: number;
}

export interface PayrollRunDTO {
  id: string;
  month: number;
  year: number;
  periodKey: string;
  status: 'Draft' | 'Processing' | 'Approved' | 'Finalized';
  totalEmployees: number;
  totalGrossPayout: number;
  totalDeductions: number;
  totalNetPayout: number;
  finalizedBy?: string;
  finalizedAt?: Date;
  lineItems: PayslipLineItemDTO[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayrollRepository {
  getStatutorySetting(financialYear: string): Promise<StatutorySettingDTO>;
  findSalaryStructure(employeeId: string): Promise<SalaryStructureDTO | null>;
  saveSalaryStructure(structure: SalaryStructureDTO): Promise<SalaryStructureDTO>;

  listOrgSalaryStructures?(): Promise<any[]>;
  createOrgSalaryStructure?(data: any): Promise<any>;
  deleteOrgSalaryStructure?(id: string): Promise<boolean>;

  findPayrollRun(periodKey: string): Promise<PayrollRunDTO | null>;
  savePayrollRun(run: PayrollRunDTO): Promise<PayrollRunDTO>;
  listPayrollRuns(): Promise<PayrollRunDTO[]>;
}

export class InMemoryPayrollRepository implements IPayrollRepository {
  private salaryStructures = new Map<string, SalaryStructureDTO>();
  private payrollRuns = new Map<string, PayrollRunDTO>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Default employee structure for EMP-SWE-0001 (CTC ₹12,00,000, Gross ₹1,00,000/mo)
    const emp1: SalaryStructureDTO = {
      id: 'SAL-001',
      employeeId: 'EMP-SWE-0001',
      effectiveFrom: '2026-01-01',
      grossSalaryMonthly: 100000,
      baseSalaryAnnual: 1200000,
      items: [
        { code: 'BASIC', amountMonthly: 50000, type: 'Earning' },
        { code: 'HRA', amountMonthly: 25000, type: 'Earning' },
        { code: 'SPECIAL', amountMonthly: 25000, type: 'Earning' },
      ],
      status: 'Active',
    };
    this.salaryStructures.set(emp1.employeeId, emp1);
  }

  async getStatutorySetting(financialYear: string): Promise<StatutorySettingDTO> {
    return {
      id: 'STAT-IN-2026',
      financialYear,
      epfEmployeeRatePercent: 12.0,
      epfEmployerRatePercent: 12.0,
      epfWageCeilingMonthly: 15000.0,
      esiEmployeeRatePercent: 0.75,
      esiEmployerRatePercent: 3.25,
      esiWageCeilingMonthly: 21000.0,
      professionalTaxMonthly: 200.0,
      effectiveFrom: new Date('2026-04-01'),
    };
  }

  async findSalaryStructure(employeeId: string): Promise<SalaryStructureDTO | null> {
    return this.salaryStructures.get(employeeId) || null;
  }

  async saveSalaryStructure(structure: SalaryStructureDTO): Promise<SalaryStructureDTO> {
    this.salaryStructures.set(structure.employeeId, { ...structure });
    return structure;
  }

  private orgSalaryStructures: any[] = [
    {
      id: 'STR-LEAD-28L',
      name: 'Engineering & Delivery Leadership Structure (CTC ₹28L)',
      description: 'Senior delivery management & leads with taxable allowances and statutory retirement benefits',
      grossMonthly: 215000,
      ctcAnnual: 2800000,
      items: [
        { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: 107500, amountAnnual: 1290000 },
        { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: 53750, amountAnnual: 645000 },
        { componentId: 'COMP-SPEC', componentName: 'Special Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: 53750, amountAnnual: 645000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'STR-SNR-18L',
      name: 'Senior Professional Structure (CTC ₹18L)',
      description: 'Senior Engineers, Leads and Managers with balanced earnings and statutory PF/PT',
      grossMonthly: 140000,
      ctcAnnual: 1800000,
      items: [
        { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: 70000, amountAnnual: 840000 },
        { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: 35000, amountAnnual: 420000 },
        { componentId: 'COMP-SPEC', componentName: 'Special Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: 35000, amountAnnual: 420000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'STR-SWE-9.6L',
      name: 'Software Engineer Structure (CTC ₹9.6L)',
      description: 'Software Engineers, Associates, and Solutions Analysts',
      grossMonthly: 75000,
      ctcAnnual: 960000,
      items: [
        { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: 37500, amountAnnual: 450000 },
        { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: 18750, amountAnnual: 225000 },
        { componentId: 'COMP-SPEC', componentName: 'Special Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: 18750, amountAnnual: 225000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  async listOrgSalaryStructures(): Promise<any[]> {
    return this.orgSalaryStructures;
  }

  async createOrgSalaryStructure(data: any): Promise<any> {
    const existingIdx = this.orgSalaryStructures.findIndex((s) => s.id === data.id);
    const struct = {
      id: data.id || `STR-CUSTOM-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      grossMonthly: data.grossMonthly,
      ctcAnnual: data.ctcAnnual || data.grossMonthly * 12,
      items: data.items || [],
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    if (existingIdx >= 0) {
      this.orgSalaryStructures[existingIdx] = struct;
    } else {
      this.orgSalaryStructures.push(struct);
    }
    return struct;
  }

  async findPayrollRun(periodKey: string): Promise<PayrollRunDTO | null> {
    return this.payrollRuns.get(periodKey) || null;
  }

  async savePayrollRun(run: PayrollRunDTO): Promise<PayrollRunDTO> {
    this.payrollRuns.set(run.periodKey, { ...run });
    return run;
  }

  async listPayrollRuns(): Promise<PayrollRunDTO[]> {
    return Array.from(this.payrollRuns.values());
  }
}

