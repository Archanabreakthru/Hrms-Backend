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

