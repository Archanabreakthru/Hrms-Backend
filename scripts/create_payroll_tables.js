const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=payroll' } } });

async function createPayrollTables() {
  console.log('Creating missing tables in payroll schema...');

  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS payroll.salary_components (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_taxable BOOLEAN DEFAULT true,
      is_statutory BOOLEAN DEFAULT false,
      calculation_rule TEXT,
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS payroll.statutory_settings (
      id VARCHAR(50) PRIMARY KEY,
      jurisdiction VARCHAR(50) DEFAULT 'IN',
      financial_year VARCHAR(50) NOT NULL,
      epf_employee_rate_percent DOUBLE PRECISION DEFAULT 12.0,
      epf_employer_rate_percent DOUBLE PRECISION DEFAULT 12.0,
      epf_wage_ceiling_monthly DOUBLE PRECISION DEFAULT 15000.0,
      esi_employee_rate_percent DOUBLE PRECISION DEFAULT 0.75,
      esi_employer_rate_percent DOUBLE PRECISION DEFAULT 3.25,
      esi_wage_ceiling_monthly DOUBLE PRECISION DEFAULT 21000.0,
      professional_tax_monthly DOUBLE PRECISION DEFAULT 200.0,
      effective_from TIMESTAMPTZ(6) NOT NULL,
      effective_to TIMESTAMPTZ(6),
      created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS payroll.payroll_runs (
      id VARCHAR(50) PRIMARY KEY,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      period_key VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'Draft',
      total_employees INTEGER DEFAULT 0,
      total_gross_payout DOUBLE PRECISION DEFAULT 0.0,
      total_deductions DOUBLE PRECISION DEFAULT 0.0,
      total_net_payout DOUBLE PRECISION DEFAULT 0.0,
      finalized_by VARCHAR(50),
      finalized_at TIMESTAMPTZ(6),
      created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS payroll.payslip_line_items (
      id VARCHAR(50) PRIMARY KEY,
      payroll_run_id VARCHAR(50) NOT NULL REFERENCES payroll.payroll_runs(id) ON DELETE CASCADE,
      employee_id VARCHAR(50) NOT NULL,
      employee_name VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      designation VARCHAR(100),
      gross_earnings DOUBLE PRECISION DEFAULT 0.0,
      total_deductions DOUBLE PRECISION DEFAULT 0.0,
      net_salary DOUBLE PRECISION DEFAULT 0.0,
      earnings_breakdown JSONB,
      deductions_breakdown JSONB,
      payment_status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Tables created successfully!');
  const tables = await p.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'payroll'`);
  console.log('Tables now in payroll schema:', tables.map(t => t.table_name));
  await p.$disconnect();
}

createPayrollTables().catch(console.error);
