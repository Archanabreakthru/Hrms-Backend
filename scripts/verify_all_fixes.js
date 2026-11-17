async function run() {
  const GATEWAY = 'http://localhost:5000/api/v1';

  console.log('--- 1. Testing Login with username "bootstrap_admin" ---');
  let loginRes = await fetch(`${GATEWAY}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bootstrap_admin', password: 'Admin@Password123!' }) // test with email fallback if password needed
  }).catch(e => ({ ok: false, error: e.message }));
  
  console.log('Login attempt with username:', loginRes.status);
  let loginData = await loginRes.json().catch(() => ({}));
  console.log('Login response:', JSON.stringify(loginData).slice(0, 150));

  console.log('\n--- 2. Testing Direct Token Generation & Authentication ---');
  // Generate real JWT token for super_admin
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    {
      sub: '790d2182-c783-42a1-bd94-e3cd28c71059',
      id: '790d2182-c783-42a1-bd94-e3cd28c71059',
      email: 'arunarchana2034@gmail.com',
      username: 'bootstrap_admin',
      role: 'super_admin',
      permissions: [
        'org.profile.read', 'org.profile.manage', 'org.branches.manage',
        'org.departments.manage', 'org.designations.manage', 'org.policies.manage',
        'auth.users.manage', 'payroll.process', 'payroll.structures.manage'
      ]
    },
    'supersecret_jwt_key_replace_in_production',
    {
      issuer: 'orbyx-auth-service',
      audience: 'orbyx-hrms-client',
      expiresIn: '1h'
    }
  );
  console.log('Generated test token successfully');

  console.log('\n--- 3. Testing GET /api/v1/auth/me ---');
  const meRes = await fetch(`${GATEWAY}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('GET /auth/me status:', meRes.status);
  const meData = await meRes.json();
  console.log('GET /auth/me data:', JSON.stringify(meData));

  console.log('\n--- 4. Testing GET /api/v1/auth/users ---');
  const usersRes = await fetch(`${GATEWAY}/auth/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('GET /auth/users status:', usersRes.status);
  const usersData = await usersRes.json();
  console.log('Total users retrieved from PostgreSQL:', usersData.data?.length);

  console.log('\n--- 5. Testing PUT /api/v1/organization/statutory (Date parsing fix) ---');
  const statPayload = {
    epfApplicable: true,
    epfEmployeeRatePercent: 12,
    epfEmployerRatePercent: 12,
    epfWageCeilingMonthly: 15000,
    epfRestrictToWageCeiling: false,
    epfEffectiveFrom: '2026-04-01',
    epfExemptionReason: '',
    esiApplicable: true,
    esiGrossThresholdMonthly: 21000,
    esiEmployeeRatePercent: 0.75,
    esiEmployerRatePercent: 3.25,
    esiEffectiveFrom: '2026-04-01',
    esiExemptionReason: '',
    ptApplicable: true,
    ptStateJurisdiction: 'Karnataka',
    ptMonthlySlabAmount: 200,
    ptMinGrossThreshold: 15000,
    ptEffectiveFrom: '2026-04-01',
    tdsApplicable: true,
    tdsFinancialYear: 'FY 2026-27',
    tdsDefaultRegime: 'New Regime (FY 2026-27)',
    tdsEffectiveFrom: '2026-04-01'
  };

  const statRes = await fetch(`${GATEWAY}/organization/statutory`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(statPayload)
  });
  console.log('PUT /organization/statutory status:', statRes.status);
  const statData = await statRes.json();
  console.log('Statutory Response:', JSON.stringify(statData).slice(0, 250));

  console.log('\n--- 6. Testing GET /api/v1/payroll/structures ---');
  const structRes = await fetch(`${GATEWAY}/payroll/structures`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('GET /payroll/structures status:', structRes.status);
  const structData = await structRes.json();
  console.log('Retrieved structures count:', structData.data?.length);

  console.log('\n--- 7. Testing POST /api/v1/payroll/structures (Create new) ---');
  const newStructId = `STR-TEST-${Date.now().toString().slice(-4)}`;
  const postRes = await fetch(`${GATEWAY}/payroll/structures`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      id: newStructId,
      name: 'Verification Salary Structure',
      description: 'Automated E2E Verification Structure',
      grossMonthly: 85000,
      ctcAnnual: 1020000,
      items: [
        { code: 'BASIC', componentName: 'Basic Salary', amountMonthly: 42500, type: 'Earning' },
        { code: 'HRA', componentName: 'HRA', amountMonthly: 21250, type: 'Earning' }
      ]
    })
  });
  console.log('POST /payroll/structures status:', postRes.status);
  const postData = await postRes.json();
  console.log('Created structure response:', JSON.stringify(postData));

  console.log('\n--- 8. Testing DELETE /api/v1/payroll/structures/:id (Trash can) ---');
  const delRes = await fetch(`${GATEWAY}/payroll/structures/${newStructId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('DELETE /payroll/structures/:id status:', delRes.status);
  const delData = await delRes.json();
  console.log('Deleted structure response:', JSON.stringify(delData));

  console.log('\n========================================');
  console.log('ALL VERIFICATION STEPS COMPLETED');
  console.log('========================================');
}

run().catch(console.error);
