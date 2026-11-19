"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaPayrollRepository = void 0;
class PrismaPayrollRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStatutorySetting(financialYear) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const rows = (await q(`SELECT * FROM payroll.statutory_settings WHERE financial_year = $1 LIMIT 1`, financialYear));
        if (rows && rows.length > 0) {
            const r = rows[0];
            return {
                id: r.id,
                financialYear: r.financial_year,
                epfEmployeeRatePercent: Number(r.epf_employee_rate_percent),
                epfEmployerRatePercent: Number(r.epf_employer_rate_percent),
                epfWageCeilingMonthly: Number(r.epf_wage_ceiling_monthly),
                esiEmployeeRatePercent: Number(r.esi_employee_rate_percent),
                esiEmployerRatePercent: Number(r.esi_employer_rate_percent),
                esiWageCeilingMonthly: Number(r.esi_wage_ceiling_monthly),
                professionalTaxMonthly: Number(r.professional_tax_monthly),
                effectiveFrom: new Date(r.effective_from),
            };
        }
        // Default template insert if not present
        const id = `STAT-IN-${financialYear.replace(/\s+/g, '')}`;
        await q(`INSERT INTO payroll.statutory_settings (
        id, jurisdiction, financial_year, epf_employee_rate_percent, epf_employer_rate_percent,
        epf_wage_ceiling_monthly, esi_employee_rate_percent, esi_employer_rate_percent,
        esi_wage_ceiling_monthly, professional_tax_monthly, effective_from
      ) VALUES (
        $1, 'IN', $2, 12.0, 12.0, 15000.0, 0.75, 3.25, 21000.0, 200.0, '2026-04-01'
      ) ON CONFLICT (id) DO NOTHING`, id, financialYear);
        return {
            id,
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
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const rows = (await q(`SELECT id, name, description, gross_monthly, ctc_annual, items, is_active
       FROM payroll.salary_structures
       WHERE id = $1
       LIMIT 1;`, employeeId));
        if (!rows || rows.length === 0)
            return null;
        const raw = rows[0];
        return {
            id: raw.id,
            employeeId: raw.id,
            effectiveFrom: new Date().toISOString(),
            grossSalaryMonthly: Number(raw.gross_monthly),
            baseSalaryAnnual: Number(raw.ctc_annual),
            items: typeof raw.items === 'string' ? JSON.parse(raw.items) : raw.items || [],
            status: raw.is_active ? 'Active' : 'Inactive',
        };
    }
    async saveSalaryStructure(structure) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const itemsJson = JSON.stringify(structure.items || []);
        await q(`INSERT INTO payroll.salary_structures (id, name, description, gross_monthly, ctc_annual, items, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, true, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         gross_monthly = EXCLUDED.gross_monthly,
         ctc_annual = EXCLUDED.ctc_annual,
         items = EXCLUDED.items,
         updated_at = CURRENT_TIMESTAMP;`, structure.employeeId, `Structure for ${structure.employeeId}`, '', structure.grossSalaryMonthly, structure.baseSalaryAnnual, itemsJson);
        return structure;
    }
    // --- Organization Salary Structure Master Operations (Grade-level matrices) ---
    async listOrgSalaryStructures() {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const rows = (await q(`
      SELECT id, name, description, gross_monthly, ctc_annual, items, is_active, created_at, updated_at
      FROM payroll.salary_structures
      ORDER BY gross_monthly DESC;
    `));
        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            grossMonthly: Number(r.gross_monthly),
            ctcAnnual: Number(r.ctc_annual),
            items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [],
            isActive: Boolean(r.is_active),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    }
    async createOrgSalaryStructure(data) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const itemsJson = JSON.stringify(data.items || []);
        await q(`INSERT INTO payroll.salary_structures (id, name, description, gross_monthly, ctc_annual, items, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         gross_monthly = EXCLUDED.gross_monthly,
         ctc_annual = EXCLUDED.ctc_annual,
         items = EXCLUDED.items,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP;`, data.id, data.name, data.description, data.grossMonthly, data.ctcAnnual, itemsJson, data.isActive !== false);
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            grossMonthly: data.grossMonthly,
            ctcAnnual: data.ctcAnnual,
            items: data.items,
            isActive: data.isActive !== false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async deleteOrgSalaryStructure(id) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        await q(`DELETE FROM payroll.salary_structures WHERE id = $1`, id);
        return true;
    }
    // --- Payroll Run Operations ---
    async findPayrollRun(periodKey) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const runRows = (await q(`SELECT * FROM payroll.payroll_runs WHERE period_key = $1 LIMIT 1`, periodKey));
        if (!runRows || runRows.length === 0)
            return null;
        const r = runRows[0];
        const itemRows = (await q(`SELECT * FROM payroll.payslip_line_items WHERE payroll_run_id = $1`, r.id));
        const lineItems = itemRows.map((item) => ({
            id: item.id,
            payrollRunId: item.payroll_run_id,
            employeeId: item.employee_id,
            employeeName: item.employee_name,
            totalWorkingDays: 30,
            daysPresent: 30,
            lossOfPayDays: 0,
            clientBillableHours: 0,
            clientAllowance: 0,
            basic: Number(item.gross_earnings) * 0.5,
            hra: Number(item.gross_earnings) * 0.3,
            specialAllowance: Number(item.gross_earnings) * 0.2,
            otherAllowances: 0,
            grossEarnings: Number(item.gross_earnings),
            epfEmployeeDeduction: Number(item.total_deductions) * 0.6,
            esiEmployeeDeduction: 0,
            professionalTaxDeduction: 200,
            tdsDeduction: 0,
            lopDeduction: 0,
            totalDeductions: Number(item.total_deductions),
            netPayable: Number(item.net_salary),
            epfEmployerContribution: Number(item.total_deductions) * 0.6,
            esiEmployerContribution: 0,
        }));
        return {
            id: r.id,
            month: r.month,
            year: r.year,
            periodKey: r.period_key,
            status: r.status,
            totalEmployees: r.total_employees,
            totalGrossPayout: Number(r.total_gross_payout),
            totalDeductions: Number(r.total_deductions),
            totalNetPayout: Number(r.total_net_payout),
            finalizedBy: r.finalized_by || undefined,
            finalizedAt: r.finalized_at ? new Date(r.finalized_at) : undefined,
            lineItems,
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at),
        };
    }
    async savePayrollRun(run) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        await q(`INSERT INTO payroll.payroll_runs (
        id, month, year, period_key, status, total_employees, total_gross_payout,
        total_deductions, total_net_payout, finalized_by, finalized_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        total_employees = EXCLUDED.total_employees,
        total_gross_payout = EXCLUDED.total_gross_payout,
        total_deductions = EXCLUDED.total_deductions,
        total_net_payout = EXCLUDED.total_net_payout,
        finalized_by = EXCLUDED.finalized_by,
        finalized_at = EXCLUDED.finalized_at,
        updated_at = CURRENT_TIMESTAMP`, run.id, run.month, run.year, run.periodKey, run.status, run.totalEmployees, run.totalGrossPayout, run.totalDeductions, run.totalNetPayout, run.finalizedBy || null, run.finalizedAt || null);
        if (run.lineItems && run.lineItems.length > 0) {
            for (const item of run.lineItems) {
                await q(`INSERT INTO payroll.payslip_line_items (
            id, payroll_run_id, employee_id, employee_name, gross_earnings,
            total_deductions, net_salary, payment_status, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'Approved', CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            gross_earnings = EXCLUDED.gross_earnings,
            total_deductions = EXCLUDED.total_deductions,
            net_salary = EXCLUDED.net_salary,
            updated_at = CURRENT_TIMESTAMP`, item.id, run.id, item.employeeId, item.employeeName, item.grossEarnings, item.totalDeductions, item.netPayable);
            }
        }
        return run;
    }
    async listPayrollRuns() {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const rows = (await q(`
      SELECT * FROM payroll.payroll_runs
      ORDER BY year DESC, month DESC;
    `));
        return rows.map((r) => ({
            id: r.id,
            month: r.month,
            year: r.year,
            periodKey: r.period_key,
            status: r.status,
            totalEmployees: r.total_employees,
            totalGrossPayout: Number(r.total_gross_payout),
            totalDeductions: Number(r.total_deductions),
            totalNetPayout: Number(r.total_net_payout),
            finalizedBy: r.finalized_by || undefined,
            finalizedAt: r.finalized_at ? new Date(r.finalized_at) : undefined,
            lineItems: [],
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at),
        }));
    }
}
exports.PrismaPayrollRepository = PrismaPayrollRepository;
