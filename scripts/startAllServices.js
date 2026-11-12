const { spawn } = require('child_process');
const path = require('path');

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

console.log('Starting ORBYX HRMS Microservices...\n');

const procs = [];

for (const svc of services) {
  const cwd = path.resolve(__dirname, '..', svc.dir);
  const p = spawn(process.execPath, [svc.entry], {
    cwd,
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env }
  });

  p.on('error', (err) => {
    console.error(`[${svc.name}] Failed to start:`, err.message);
  });

  procs.push(p);
}

process.on('SIGINT', () => {
  console.log('\nStopping all services...');
  for (const p of procs) p.kill();
  process.exit(0);
});
