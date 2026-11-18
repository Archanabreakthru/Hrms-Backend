"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPayrollRepository = void 0;
class InMemoryPayrollRepository {
    salaryStructures = new Map();
    payrollRuns = new Map();
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        // Default employee structure for EMP-SWE-0001 (CTC ₹12,00,000, Gross ₹1,00,000/mo)
        const emp1 = {
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
    async getStatutorySetting(financialYear) {
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
    async findSalaryStructure(employeeId) {
        return this.salaryStructures.get(employeeId) || null;
    }
    async saveSalaryStructure(structure) {
        this.salaryStructures.set(structure.employeeId, { ...structure });
        return structure;
    }
    orgSalaryStructures = [
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
    async listOrgSalaryStructures() {
        return this.orgSalaryStructures;
    }
    async createOrgSalaryStructure(data) {
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
        }
        else {
            this.orgSalaryStructures.push(struct);
        }
        return struct;
    }
    async findPayrollRun(periodKey) {
        return this.payrollRuns.get(periodKey) || null;
    }
    async savePayrollRun(run) {
        this.payrollRuns.set(run.periodKey, { ...run });
        return run;
    }
    async listPayrollRuns() {
        return Array.from(this.payrollRuns.values());
    }
}
exports.InMemoryPayrollRepository = InMemoryPayrollRepository;
