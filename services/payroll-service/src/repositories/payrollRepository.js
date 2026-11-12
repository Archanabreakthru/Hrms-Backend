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
