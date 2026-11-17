const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../services/payroll-service/.env'), 'utf8');
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] ? match[2].trim() : '';
    val = val.replace(/^["']|["']$/g, '');
    process.env[match[1]] = val;
  }
});

const { PrismaClient } = require(path.join(__dirname, '../services/payroll-service/src/generated/client'));
const prisma = new PrismaClient();

async function run() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const existing = await q('SELECT count(*)::int as count FROM payroll.salary_structures;');
  console.log('Existing count before seeding:', existing[0].count);

  if (existing[0].count === 0) {
    const structures = [
      {
        id: 'STR-LEAD-28L',
        name: 'Engineering & Delivery Leadership Structure (CTC ₹28L)',
        description: 'Senior delivery management & leads with taxable allowances and statutory retirement benefits',
        gross_monthly: 215000,
        ctc_annual: 2800000,
        items: JSON.stringify([
          { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: 107500, amountAnnual: 1290000 },
          { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: 53750, amountAnnual: 645000 },
          { componentId: 'COMP-SPEC', componentName: 'Special Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: 53750, amountAnnual: 645000 }
        ])
      },
      {
        id: 'STR-SNR-18L',
        name: 'Senior Professional Structure (CTC ₹18L)',
        description: 'Senior Engineers, Leads and Managers with balanced earnings and statutory PF/PT',
        gross_monthly: 140000,
        ctc_annual: 1800000,
        items: JSON.stringify([
          { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: 70000, amountAnnual: 840000 },
          { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: 35000, amountAnnual: 420000 },
          { componentId: 'COMP-SPEC', componentName: 'Special Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: 35000, amountAnnual: 420000 }
        ])
      },
      {
        id: 'STR-SWE-9.6L',
        name: 'Software Engineer Structure (CTC ₹9.6L)',
        description: 'Software Engineers, Associates, and Solutions Analysts',
        gross_monthly: 75000,
        ctc_annual: 960000,
        items: JSON.stringify([
          { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: 37500, amountAnnual: 450000 },
          { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: 18750, amountAnnual: 225000 },
          { componentId: 'COMP-SPEC', componentName: 'Special Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: 18750, amountAnnual: 225000 }
        ])
      }
    ];

    for (const s of structures) {
      await q(
        'INSERT INTO payroll.salary_structures (id, name, description, gross_monthly, ctc_annual, items, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, true, CURRENT_TIMESTAMP)',
        s.id, s.name, s.description, s.gross_monthly, s.ctc_annual, s.items
      );
    }
    console.log('✓ Seeded canonical salary structures into PostgreSQL payroll.salary_structures');
  }

  const res = await q('SELECT id, name, gross_monthly, ctc_annual, is_active FROM payroll.salary_structures;');
  console.log('Current records in PostgreSQL:', res);
  await prisma['$disconnect']();
}

run().catch(console.error);

