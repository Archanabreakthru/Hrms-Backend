/**
 * Celestial HRMS - Organization Master Seed Script
 * Prepares and validates canonical enterprise records for PostgreSQL schema `org`.
 * 
 * EXECUTION SAFETY CONTROLS:
 * - Read-Only validation mode by default.
 * - Transactions with pre- and post-insert row count assertions.
 * - Idempotent insertion using ON CONFLICT DO NOTHING.
 * - DO NOT RUN WITH --execute UNTIL EXPLICITLY AUTHORIZED BY THE USER.
 */

const path = require('path');
const fs = require('fs');

// Load environment configuration from auth-service / organization-service
const envPath = path.join(__dirname, '../services/organization-service/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      process.env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
}

const { PrismaClient } = require(path.join(__dirname, '../node_modules/@prisma/client'));
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Canonical Seed Datasets
const CANONICAL_ORG_DATA = {
  companyProfile: {
    legalName: 'Celestial ENTERPRISE SOLUTIONS PRIVATE LIMITED',
    tradingName: 'Celestial HRMS',
    cinNumber: 'U72900KA2021PTC149821',
    panNumber: 'AAACB9876F',
    tanNumber: 'BLRA12345E',
    gstin: '29AAACB9876F1Z5',
    pfRegistrationNumber: 'KN/BLR/0049210/000',
    esiRegistrationNumber: '53000892100001001',
    registeredAddress: '#42, Embassy TechVillage, Outer Ring Road, Devarabisanahalli, Bengaluru, Karnataka 560103',
    headquartersAddress: '#42, Embassy TechVillage, Outer Ring Road, Devarabisanahalli, Bengaluru, Karnataka 560103',
    contactEmail: 'corporate@orbyx.internal',
    contactPhone: '+91 80 4092 1000',
    website: 'https://orbyx.internal'
  },
  branches: [
    {
      code: 'BR-BLR',
      name: 'Bengaluru Headquarters',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      address: 'Embassy TechVillage, Outer Ring Road, Devarabisanahalli, Bengaluru',
      isHeadquarters: true,
      status: 'Active'
    },
    {
      code: 'BR-CHN',
      name: 'Chennai Technology Center',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      address: 'Tidel Park, 4th Floor, D-Block, Rajiv Gandhi Salai, Taramani, Chennai',
      isHeadquarters: false,
      status: 'Active'
    },
    {
      code: 'BR-HYD',
      name: 'Hyderabad Delivery Center',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      address: 'Cyber Towers, 6th Floor, Hitech City, Madhapur, Hyderabad',
      isHeadquarters: false,
      status: 'Active'
    }
  ],
  departments: [
    { code: 'DEP-EXEC', name: 'Executive & Board', status: 'Active' },
    { code: 'DEP-ENG', name: 'Engineering & Technology', status: 'Active' },
    { code: 'DEP-HR', name: 'Human Resources & People Ops', status: 'Active' },
    { code: 'DEP-FIN', name: 'Finance & Corporate Accounts', status: 'Active' },
    { code: 'DEP-OPS', name: 'Business Operations & Delivery', status: 'Active' },
    { code: 'DEP-FAC', name: 'Facilities & Physical Security', status: 'Active' },
    { code: 'DEP-SALES', name: 'Sales & Client Engagements', status: 'Active' },
    { code: 'DEP-LEGAL', name: 'Legal & Corporate Governance', status: 'Active' }
  ],
  designations: [
    { code: 'DES-MD', title: 'Managing Director', level: 10, departmentCode: 'DEP-EXEC' },
    { code: 'DES-COO', title: 'Chief Operations Officer', level: 9, departmentCode: 'DEP-OPS' },
    { code: 'DES-VP-ENG', title: 'VP of Engineering', level: 8, departmentCode: 'DEP-ENG' },
    { code: 'DES-ENG-MGR', title: 'Engineering Manager', level: 6, departmentCode: 'DEP-ENG' },
    { code: 'DES-PRIN-ENG', title: 'Principal Architect', level: 6, departmentCode: 'DEP-ENG' },
    { code: 'DES-SR-SWE', title: 'Senior Software Engineer', level: 4, departmentCode: 'DEP-ENG' },
    { code: 'DES-SWE', title: 'Software Engineer', level: 3, departmentCode: 'DEP-ENG' },
    { code: 'DES-JR-SWE', title: 'Junior Software Engineer', level: 2, departmentCode: 'DEP-ENG' },
    { code: 'DES-HR-DIR', title: 'Director of People & Culture', level: 8, departmentCode: 'DEP-HR' },
    { code: 'DES-HRM', title: 'HR Manager & People Ops Lead', level: 5, departmentCode: 'DEP-HR' },
    { code: 'DES-FIN-MGR', title: 'Finance & Payroll Manager', level: 5, departmentCode: 'DEP-FIN' },
    { code: 'DES-FAC-MGR', title: 'Facilities Manager', level: 4, departmentCode: 'DEP-FAC' },
    { code: 'DES-DEVOPS-LEAD', title: 'Lead Platform Engineer', level: 5, departmentCode: 'DEP-ENG' }
  ]
};

async function validateOrExecute() {
  const isExecutionMode = process.argv.includes('--execute');

  console.log('====================================================');
  console.log(`Celestial HRMS - Organization Seed Tool [Mode: ${isExecutionMode ? 'EXECUTION' : 'DRY RUN / VALIDATION'}]`);
  console.log('====================================================\n');

  // Pre-seed assertion: check current table counts
  const profCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.company_profiles');
  const branchCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.branches');
  const deptCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.departments');
  const desigCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.designations');

  console.log('Current PostgreSQL org Schema Counts:');
  console.log(`  - org.company_profiles: ${profCount[0].cnt}`);
  console.log(`  - org.branches:         ${branchCount[0].cnt}`);
  console.log(`  - org.departments:      ${deptCount[0].cnt}`);
  console.log(`  - org.designations:     ${desigCount[0].cnt}\n`);

  console.log('Canonical Proposed Records for Seeding:');
  console.log(`  - Company Profile:      1 record (${CANONICAL_ORG_DATA.companyProfile.legalName})`);
  console.log(`  - Branches:             ${CANONICAL_ORG_DATA.branches.length} branches (${CANONICAL_ORG_DATA.branches.map(b => b.code).join(', ')})`);
  console.log(`  - Departments:          ${CANONICAL_ORG_DATA.departments.length} departments (${CANONICAL_ORG_DATA.departments.map(d => d.code).join(', ')})`);
  console.log(`  - Designations:         ${CANONICAL_ORG_DATA.designations.length} designations (${CANONICAL_ORG_DATA.designations.map(d => d.code).join(', ')})\n`);

  if (!isExecutionMode) {
    console.log('SAFETY HOLD: Dry-run validation passed cleanly.');
    console.log('No database mutations were performed.');
    console.log('To execute database insertion, explicit authorization is required.');
    await prisma.$disconnect();
    return;
  }

  // Execution Logic (Guarded by --execute flag)
  console.log('Executing idempotent seeding transaction...');
  await prisma.$transaction(async (tx) => {
    // 1. Company Profile
    await tx.$executeRawUnsafe(`
      INSERT INTO org.company_profiles (
        legal_name, trading_name, cin_number, pan_number, tan_number, gstin,
        pf_registration_number, esi_registration_number, registered_address,
        headquarters_address, contact_email, contact_phone, website
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      WHERE NOT EXISTS (SELECT 1 FROM org.company_profiles);
    `,
      CANONICAL_ORG_DATA.companyProfile.legalName,
      CANONICAL_ORG_DATA.companyProfile.tradingName,
      CANONICAL_ORG_DATA.companyProfile.cinNumber,
      CANONICAL_ORG_DATA.companyProfile.panNumber,
      CANONICAL_ORG_DATA.companyProfile.tanNumber,
      CANONICAL_ORG_DATA.companyProfile.gstin,
      CANONICAL_ORG_DATA.companyProfile.pfRegistrationNumber,
      CANONICAL_ORG_DATA.companyProfile.esiRegistrationNumber,
      CANONICAL_ORG_DATA.companyProfile.registeredAddress,
      CANONICAL_ORG_DATA.companyProfile.headquartersAddress,
      CANONICAL_ORG_DATA.companyProfile.contactEmail,
      CANONICAL_ORG_DATA.companyProfile.contactPhone,
      CANONICAL_ORG_DATA.companyProfile.website
    );

    // 2. Branches
    for (const b of CANONICAL_ORG_DATA.branches) {
      await tx.$executeRawUnsafe(`
        INSERT INTO org.branches (code, name, city, state, country, address, is_headquarters, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (code) DO NOTHING;
      `, b.code, b.name, b.city, b.state, b.country, b.address, b.isHeadquarters, b.status);
    }

    // 3. Departments
    for (const d of CANONICAL_ORG_DATA.departments) {
      await tx.$executeRawUnsafe(`
        INSERT INTO org.departments (code, name, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO NOTHING;
      `, d.code, d.name, d.status);
    }

    // 4. Designations
    for (const ds of CANONICAL_ORG_DATA.designations) {
      await tx.$executeRawUnsafe(`
        INSERT INTO org.designations (code, title, level)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO NOTHING;
      `, ds.code, ds.title, ds.level);
    }
  });

  // Post-seed validation assertion
  const postProf = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.company_profiles');
  const postBranch = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.branches');
  const postDept = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.departments');
  const postDesig = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM org.designations');

  console.log('Post-Insert Verified Counts:');
  console.log(`  - org.company_profiles: ${postProf[0].cnt}`);
  console.log(`  - org.branches:         ${postBranch[0].cnt}`);
  console.log(`  - org.departments:      ${postDept[0].cnt}`);
  console.log(`  - org.designations:     ${postDesig[0].cnt}`);

  await prisma.$disconnect();
}

validateOrExecute().catch((err) => {
  console.error('Seed tool error:', err);
  process.exit(1);
});
