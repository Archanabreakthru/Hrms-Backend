"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaPayrollRepository = void 0;
class PrismaPayrollRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
        const q = this.prisma['$queryRawUnsafe'].bind(this.prisma);
        const rows = await q(`
      SELECT id, name, description, gross_monthly, ctc_annual, items, is_active
      FROM payroll.salary_structures
      WHERE id = $1
      LIMIT 1;
    `, employeeId);
        if (!rows || rows.length === 0)
            return null;
        const raw = rows[0];
        return {
            id: raw.id,
            employeeId: raw.id,
            effectiveFrom: new Date().toISOString(),
            grossSalaryMonthly: Number(raw.gross_monthly),
            baseSalaryAnnual: Number(raw.ctc_annual),
            items: typeof raw.items === 'string' ? JSON.parse(raw.items) : (raw.items || []),
            status: raw.is_active ? 'Active' : 'Inactive',
        };
    }
    async saveSalaryStructure(structure) {
        const q = this.prisma['$queryRawUnsafe'].bind(this.prisma);
        const itemsJson = JSON.stringify(structure.items || []);
        await q(`
      INSERT INTO payroll.salary_structures (id, name, description, gross_monthly, ctc_annual, items, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, true, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        gross_monthly = EXCLUDED.gross_monthly,
        ctc_annual = EXCLUDED.ctc_annual,
        items = EXCLUDED.items,
        updated_at = CURRENT_TIMESTAMP;
    `, structure.employeeId, `Structure for ${structure.employeeId}`, '', structure.grossSalaryMonthly, structure.baseSalaryAnnual, itemsJson);
        return structure;
    }
    // --- Organization Salary Structure Master Operations (Grade-level matrices) ---
    async listOrgSalaryStructures() {
        const q = this.prisma['$queryRawUnsafe'].bind(this.prisma);
        const rows = await q(`
      SELECT id, name, description, gross_monthly, ctc_annual, items, is_active, created_at, updated_at
      FROM payroll.salary_structures
      ORDER BY gross_monthly DESC;
    `);
        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            grossMonthly: Number(r.gross_monthly),
            ctcAnnual: Number(r.ctc_annual),
            items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
            isActive: Boolean(r.is_active),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    }
    async createOrgSalaryStructure(data) {
        const q = this.prisma['$queryRawUnsafe'].bind(this.prisma);
        const itemsJson = JSON.stringify(data.items || []);
        await q(`
      INSERT INTO payroll.salary_structures (id, name, description, gross_monthly, ctc_annual, items, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        gross_monthly = EXCLUDED.gross_monthly,
        ctc_annual = EXCLUDED.ctc_annual,
        items = EXCLUDED.items,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;
    `, data.id, data.name, data.description, data.grossMonthly, data.ctcAnnual, itemsJson, data.isActive !== false);
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
        const q = this.prisma['$queryRawUnsafe'].bind(this.prisma);
        await q(`DELETE FROM payroll.salary_structures WHERE id = $1`, id);
        return true;
    }
    // --- Payroll Run Operations ---
    async findPayrollRun(periodKey) {
        return null;
    }
    async savePayrollRun(run) {
        return run;
    }
    async listPayrollRuns() {
        return [];
    }
}
exports.PrismaPayrollRepository = PrismaPayrollRepository;
