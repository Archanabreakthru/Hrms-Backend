const http = require('http');

function req(options, data) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      let b = '';
      res.on('data', chunk => b += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(typeof data === 'string' ? data : JSON.stringify(data));
    r.end();
  });
}

async function test() {
  // Login as Super Admin
  const login = await req({
    hostname: 'localhost', port: 5000, path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'arunarchana2034@gmail.com', password: 'Admin@Password123!' });

  const token = login.data?.data?.accessToken;
  console.log('Login status:', login.status, 'HasToken:', !!token);

  // Get statutory config
  const getStat = await req({
    hostname: 'localhost', port: 5000, path: '/api/v1/organization/statutory', method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('GET /organization/statutory:', getStat.status, getStat.data);

  // Update statutory config
  const updateStat = await req({
    hostname: 'localhost', port: 5000, path: '/api/v1/organization/statutory', method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, {
    epfApplicable: true,
    epfEmployeeRatePercent: 12,
    epfEmployerRatePercent: 12,
    epfWageCeilingMonthly: 15000,
    epfRestrictToWageCeiling: false,
    epfEffectiveFrom: '2026-04-01',
    esiApplicable: true,
    esiGrossThresholdMonthly: 21000,
    esiEmployeeRatePercent: 0.75,
    esiEmployerRatePercent: 3.25,
    esiEffectiveFrom: '2026-04-01',
    ptApplicable: true,
    ptStateJurisdiction: 'Karnataka',
    ptMonthlySlabAmount: 200,
    ptMinGrossThreshold: 15000,
    ptEffectiveFrom: '2026-04-01',
    tdsApplicable: true,
    tdsFinancialYear: 'FY 2026-27',
    tdsDefaultRegime: 'New Regime (FY 2026-27)'
  });
  console.log('PUT /organization/statutory:', updateStat.status, updateStat.data);
}
test().catch(console.error);
