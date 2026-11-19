const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const services = [
  { name: 'API Gateway', dir: 'api-gateway', entry: 'src/server.js', port: 5000 },
  { name: 'Auth Service', dir: 'services/auth-service', entry: 'src/server.js', port: 5001 },
  { name: 'Organization Service', dir: 'services/organization-service', entry: 'src/server.js', port: 5002 },
  { name: 'Employee Service', dir: 'services/employee-service', entry: 'src/server.js', port: 5009 },
  { name: 'Attendance Service', dir: 'services/attendance-service', entry: 'src/server.js', port: 5003 },
  { name: 'Payroll Service', dir: 'services/payroll-service', entry: 'src/server.js', port: 5004 },
  { name: 'Expense Service', dir: 'services/expense-service', entry: 'src/server.js', port: 5005 },
  { name: 'Asset Service', dir: 'services/asset-service', entry: 'src/server.js', port: 5006 },
  { name: 'Client Service', dir: 'services/client-service', entry: 'src/server.js', port: 5007 },
  { name: 'Notification Service', dir: 'services/notification-service', entry: 'src/server.js', port: 5008 }
];

console.log('Starting Celestial HRMS Microservices...\n');

console.log('------------------------------------------------------------');
console.log('🌐 Microservices & API Gateway Endpoints:');
for (const svc of services) {
  const url = `http://localhost:${svc.port}`;
  const note = svc.name === 'API Gateway' ? ' (Central Swagger: ' + url + '/api-docs)' : '';
  console.log(`  • ${svc.name.padEnd(24)} -> ${url}${note}`);
}
console.log('------------------------------------------------------------\n');

const procs = [];

for (const svc of services) {
  const cwd = path.resolve(__dirname, '..', svc.dir);
  const childEnv = { ...process.env };
  delete childEnv.DATABASE_URL;
  if (svc.port) {
    childEnv.PORT = String(svc.port);
  }
  const p = spawn(process.execPath, [svc.entry], {
    cwd,
    stdio: 'inherit',
    windowsHide: true,
    env: childEnv
  });

  p.on('error', (err) => {
    console.error(`[${svc.name}] Failed to start:`, err.message);
  });

  p.on('exit', (code, signal) => {
    console.log(`[${svc.name}] Process exited with code ${code} signal ${signal}`);
  });

  procs.push(p);
}

// Keep the event loop alive indefinitely to monitor microservices
process.stdin.resume();
setInterval(() => {}, 1000 * 60 * 60);

process.on('SIGINT', () => {
  console.log('\nStopping all services...');
  for (const p of procs) p.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nStopping all services (SIGTERM)...');
  for (const p of procs) p.kill();
  process.exit(0);
});
