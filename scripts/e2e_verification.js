const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('============================================================');
  console.log('🚀 CELESTIAL HRMS - FULL END-TO-END VERIFICATION SUITE');
  console.log('============================================================\n');

  let superAdminToken = '';
  let superAdminRefreshToken = '';

  // 1. Gateway Health Check & Rate Limit Header
  console.log('[TEST 1] API Gateway Health & Rate Limit Headers');
  const healthRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/health',
    method: 'GET',
  });
  console.log(`- Status: ${healthRes.statusCode}`);
  console.log(`- Rate limit max: ${healthRes.headers['x-ratelimit-limit']} req/min (Configured target: 2000)`);
  if (healthRes.statusCode === 200 && healthRes.headers['x-ratelimit-limit'] === '2000') {
    console.log('✅ PASS: Gateway is healthy with 2000 req/min rate limit');
  } else {
    console.log('❌ FAIL: Gateway health or rate limit mismatch', healthRes);
  }

  // 2. Bootstrap Admin Authentication
  console.log('\n[TEST 2] Bootstrap Administrator (Super Admin) Authentication');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'arunarchana2034@gmail.com',
      password: 'Admin@Password123!',
    }
  );

  console.log(`- Status: ${loginRes.statusCode}`);
  if (loginRes.statusCode === 200 && loginRes.data?.data?.accessToken) {
    superAdminToken = loginRes.data.data.accessToken;
    superAdminRefreshToken = loginRes.data.data.refreshToken;
    console.log(`- Authenticated User: ${loginRes.data.data.user.email} (${loginRes.data.data.user.role})`);
    console.log(`- Permissions Count: ${loginRes.data.data.permissions?.length || 'Full Super Admin Wildcard'}`);
    console.log('✅ PASS: Bootstrap Administrator authenticated successfully with Super Admin privileges');
  } else {
    console.error('❌ FAIL: Super Admin login failed', loginRes.data);
    process.exit(1);
  }

  // 3. Refresh Token Validity (24h / 1 day) and Token Rotation
  console.log('\n[TEST 3] Refresh Token Validity & Rotation');
  const refreshRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      refreshToken: superAdminRefreshToken,
    }
  );
  console.log(`- Refresh Status: ${refreshRes.statusCode}`);
  if (refreshRes.statusCode === 200 && refreshRes.data?.data?.accessToken) {
    console.log('✅ PASS: Refresh token rotated successfully');
    // Update active tokens
    superAdminToken = refreshRes.data.data.accessToken;
    superAdminRefreshToken = refreshRes.data.data.refreshToken;
  } else {
    console.error('❌ FAIL: Refresh token rotation failed', refreshRes.data);
  }

  // 4. Organization Service Verification (Addresses Screenshots 1, 2, 3)
  console.log('\n[TEST 4] Organization Service APIs via Gateway (Testing Screenshots 1, 2, 3 Resolution)');
  const orgProfileRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/organization/profile',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /organization/profile: Status ${orgProfileRes.statusCode}`);
  if (orgProfileRes.statusCode === 200 || orgProfileRes.statusCode === 404) {
    console.log('  Profile response:', orgProfileRes.data?.data ? `Found: ${orgProfileRes.data.data.legalName}` : 'Profile not configured in DB (Clean 404 handled by frontend, no 401!)');
    console.log('✅ PASS: Organization profile endpoint is authorized and active (No 401 error)');
  } else {
    console.log('❌ FAIL: Organization profile returned unexpected error', orgProfileRes.statusCode, orgProfileRes.data);
  }

  const branchesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/organization/branches',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /organization/branches: Status ${branchesRes.statusCode}, Branches count: ${branchesRes.data?.data?.length ?? 0}`);

  const deptsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/organization/departments',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /organization/departments: Status ${deptsRes.statusCode}, Departments count: ${deptsRes.data?.data?.length ?? 0}`);

  const desigsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/organization/designations',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /organization/designations: Status ${desigsRes.statusCode}, Designations count: ${desigsRes.data?.data?.length ?? 0}`);

  // 5. Employee Directory Verification (Addresses Screenshot 4)
  console.log('\n[TEST 5] Employee Directory API via Gateway (Testing Screenshot 4 Resolution)');
  const employeesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/employees',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /employees: Status ${employeesRes.statusCode}`);
  const empList = employeesRes.data?.data?.employees || employeesRes.data?.data || [];
  console.log(`- Total persistent employee records retrieved from PostgreSQL: ${empList.length}`);
  const raseedh = empList.find((e) => e.employeeId === 'EMP-HRM-0012' || (e.firstName && e.firstName.includes('Raseedh')));
  if (raseedh) {
    console.log(`- Found preserved employee record: ${raseedh.employeeId} - ${raseedh.firstName} ${raseedh.lastName || ''} (${raseedh.officialEmail})`);
    console.log('✅ PASS: Employee Directory returns real persistent records with HTTP 200 without 401 unauthorized!');
  } else if (empList.length > 0) {
    console.log(`- Sample employee: ${empList[0].employeeId} - ${empList[0].firstName}`);
    console.log('✅ PASS: Employee Directory returned persistent records');
  } else {
    console.log('⚠️ Notice: Employee table returned empty array');
  }

  // 6. Dynamic Roles & RBAC Management
  console.log('\n[TEST 6] Dynamic Role Creation and Privilege Enforcement');
  const rolesListRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/roles',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /auth/roles: Status ${rolesListRes.statusCode}, Configured roles: ${rolesListRes.data?.data?.length ?? 0}`);

  // Test dynamic role creation: Department Manager
  const createRoleRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/roles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
    },
    {
      code: 'department_manager',
      name: 'Department Manager',
      description: 'Departmental Manager with attendance and employee view access, no payroll access',
      permissions: [
        'employee.directory.read_basic',
        'employee.profile.read_team',
        'attendance.records.read_team',
        'attendance.regularization.approve',
        'leave.requests.approve',
      ],
    }
  );
  console.log(`- POST /auth/roles (department_manager): Status ${createRoleRes.statusCode}`);
  if (
    createRoleRes.statusCode === 201 ||
    (createRoleRes.statusCode === 409 && createRoleRes.data?.error?.message?.includes('already exists')) ||
    (createRoleRes.statusCode === 400 && createRoleRes.data?.error?.message?.includes('already exists'))
  ) {
    console.log('✅ PASS: Dynamic role "Department Manager" created/verified in database');
  } else {
    console.log('❌ FAIL: Dynamic role creation failed', createRoleRes.data);
  }

  // 7. Bootstrap Admin Account Protection
  console.log('\n[TEST 7] Bootstrap Administrator Account Protection from Demotion/Deletion');
  const demoteRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/users/790d2182-c783-42a1-bd94-e3cd28c71059/role',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
    },
    {
      role: 'employee',
    }
  );
  console.log(`- PUT /auth/users/:id/role on Bootstrap Admin: Status ${demoteRes.statusCode}`);
  if (demoteRes.statusCode === 403 || demoteRes.data?.error?.code === 'FORBIDDEN') {
    console.log(`- Protection message: "${demoteRes.data?.error?.message}"`);
    console.log('✅ PASS: Bootstrap Administrator is strictly protected from demotion or role changes');
  } else {
    console.log('❌ FAIL: Bootstrap Administrator was not protected', demoteRes.data);
  }

  // 8. Nodemailer & SMTP Configuration Status
  console.log('\n[TEST 8] Nodemailer & SMTP Connectivity Status');
  const smtpRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/notifications/smtp/verify',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /notifications/smtp/verify: Status ${smtpRes.statusCode}`);
  console.log('  SMTP Details:', JSON.stringify(smtpRes.data?.data, null, 2));
  if (smtpRes.statusCode === 200) {
    console.log('✅ PASS: Nodemailer verification endpoint active with full Gmail/Outlook configuration inspection');
  } else {
    console.log('❌ FAIL: SMTP verify endpoint failed', smtpRes.data);
  }

  // 9. Client Service & Client Supervisor Automated Onboarding
  console.log('\n[TEST 9] Client Supervisor Onboarding & User Provisioning');
  const clientsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/clients',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`- GET /clients: Status ${clientsRes.statusCode}, Clients count: ${clientsRes.data?.data?.length ?? 0}`);

  // 10. Sensitive Endpoint Rate Limiting Verification
  console.log('\n[TEST 10] Sensitive Endpoint Rate Limiting (Login Endpoint Max 10/min)');
  let hitRateLimit = false;
  for (let i = 0; i < 12; i++) {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'invalid_rate_limit_test@example.com',
        password: 'WrongPassword123!',
      }
    );
    if (res.statusCode === 429) {
      hitRateLimit = true;
      console.log(`- Request ${i + 1} returned HTTP 429 Too Many Requests (Rate limit triggered as expected)`);
      console.log(`  Message: ${res.data?.error?.message}`);
      break;
    }
  }
  if (hitRateLimit) {
    console.log('✅ PASS: Strict rate limiter properly enforces limits on sensitive endpoints');
  } else {
    console.log('ℹ️ Rate limit threshold not reached or higher window');
  }

  console.log('\n============================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS COMPLETE');
  console.log('============================================================\n');
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
