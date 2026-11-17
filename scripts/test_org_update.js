const path = require('path');
const jwt = require(path.join(__dirname, '../node_modules/jsonwebtoken'));
const http = require('http');

const token = jwt.sign(
  {
    userId: '790d2182-c783-42a1-bd94-e3cd28c71059',
    role: 'super_admin',
    permissions: ['org.profile.manage']
  },
  'supersecret_jwt_key_replace_in_production',
  { expiresIn: '1h', issuer: 'orbyx-auth-service', audience: 'orbyx-hrms-client' }
);

const payload = JSON.stringify({
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

const req = http.request(
  {
    host: '127.0.0.1',
    port: 5002,
    path: '/api/v1/organization/statutory',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': 'Bearer ' + token
    }
  },
  (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('UPDATE STATUS:', res.statusCode, body));
  }
);
req.on('error', console.error);
req.write(payload);
req.end();

