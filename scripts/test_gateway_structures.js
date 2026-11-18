const path = require('path');
const jwt = require(path.join(__dirname, '../node_modules/jsonwebtoken'));
const http = require('http');

const token = jwt.sign(
  {
    userId: '790d2182-c783-42a1-bd94-e3cd28c71059',
    role: 'super_admin',
    permissions: ['payroll.process', 'payroll.structures.manage', 'org.profile.manage']
  },
  'orbyx-super-secure-jwt-secret-key-32chars',
  { expiresIn: '1h' }
);

const payload = JSON.stringify({
  id: 'STR-TEST-PG-2',
  name: 'Test Structure from Gateway',
  description: 'Verified live',
  grossMonthly: 90000,
  ctcAnnual: 1080000,
  items: [
    { componentId: 'COMP-BASIC', componentName: 'Basic Salary', componentCode: 'BASIC', type: 'Earning', amountMonthly: 45000, amountAnnual: 540000 },
    { componentId: 'COMP-HRA', componentName: 'House Rent Allowance (HRA)', componentCode: 'HRA', type: 'Earning', amountMonthly: 22500, amountAnnual: 270000 },
    { componentId: 'COMP-SPEC', componentName: 'Special Allowance', componentCode: 'SPECIAL', type: 'Earning', amountMonthly: 22500, amountAnnual: 270000 }
  ]
});

const req = http.request(
  {
    host: '127.0.0.1',
    port: 5000,
    path: '/api/v1/payroll/structures',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': 'Bearer ' + token
    }
  },
  (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('GATEWAY POST /payroll/structures RESULT:', res.statusCode, body));
  }
);
req.on('error', console.error);
req.write(payload);
req.end();
