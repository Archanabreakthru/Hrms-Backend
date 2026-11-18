const http = require('http');

async function testGateway() {
  // 1. Login via Gateway to get real token
  const loginPayload = JSON.stringify({ email: 'raseedh@orbyx.internal', password: 'Raseedh@2026PasswordSetup' });
  const loginRes = await new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(loginPayload);
    req.end();
  });

  const token = loginRes.data.accessToken;
  console.log('Got real token! Testing PUT /api/v1/organization/statutory via Gateway 5000:');

  const statutoryPayload = JSON.stringify({
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
  });

  const statRes = await new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: 5000,
      path: '/api/v1/organization/statutory',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(statutoryPayload),
        'Authorization': 'Bearer ' + token
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.write(statutoryPayload);
    req.end();
  });

  console.log('GATEWAY PUT /organization/statutory:', statRes.status, statRes.body);

  console.log('\nTesting POST /api/v1/payroll/structures via Gateway 5000:');
  const structPayload = JSON.stringify({
    name: 'Real Gateway Test Structure',
    description: 'Created through API gateway',
    grossMonthly: 95000
  });

  const structRes = await new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: 5000,
      path: '/api/v1/payroll/structures',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(structPayload),
        'Authorization': 'Bearer ' + token
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.write(structPayload);
    req.end();
  });

  console.log('GATEWAY POST /payroll/structures:', structRes.status, structRes.body);
}

testGateway().catch(console.error);

