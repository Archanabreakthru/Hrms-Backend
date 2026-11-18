const path = require('path');
const fs = require('fs');

const envFile = fs.readFileSync(path.join(__dirname, '../services/client-service/.env'), 'utf8');
envFile.split(/\r?\n/).forEach(l => {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});

const jwt = require(path.resolve(__dirname, '../node_modules/jsonwebtoken'));

const token = jwt.sign({
  sub: 'sup-user-test-1',
  email: 'sup@client.test',
  role: 'client_supervisor',
  clientId: 'some-id',
  permissions: ['client.portal.login', 'client.deployments.read_assigned']
}, process.env.JWT_SECRET, { issuer: 'orbyx-auth-service', audience: 'orbyx-hrms-client', expiresIn: '1h' });

const { createAuthMiddleware, requirePermission } = require(path.resolve(__dirname, '../shared/dist/middleware/auth.js'));
const authMid = createAuthMiddleware(process.env.JWT_SECRET, 'orbyx-auth-service', 'orbyx-hrms-client');
const permMid = requirePermission('client.deployments.manage', 'client.deployments.read_assigned');

const req = {
  headers: { authorization: 'Bearer ' + token }
};
const res = {};

authMid(req, res, (errAuth) => {
  console.log('authMid err:', errAuth, 'req.user:', req.user);
  permMid(req, res, (errPerm) => {
    console.log('permMid err:', errPerm);
  });
});

