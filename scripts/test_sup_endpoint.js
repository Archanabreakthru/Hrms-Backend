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
  clientId: '00000000-0000-0000-0000-000000000000',
  permissions: ['client.portal.login', 'client.deployments.read_assigned']
}, process.env.JWT_SECRET, { issuer: 'orbyx-auth-service', audience: 'orbyx-hrms-client', expiresIn: '1h' });

const { createApp } = require(path.resolve(__dirname, '../services/client-service/src/app.js'));
const { ClientService } = require(path.resolve(__dirname, '../services/client-service/src/services/clientService.js'));
const { ClientController } = require(path.resolve(__dirname, '../services/client-service/src/controllers/clientController.js'));
const { InMemoryClientRepository } = require(path.resolve(__dirname, '../services/client-service/src/repositories/clientRepository.js'));

const repo = new InMemoryClientRepository();
const service = new ClientService(repo);
const controller = new ClientController(service);
const app = createApp(controller);

const server = app.listen(5098, async () => {
  try {
    const res = await fetch('http://localhost:5098/api/v1/clients/deployments', {
      headers: { authorization: 'Bearer ' + token }
    });
    console.log('Status on 5098:', res.status);
    const body = await res.text();
    console.log('Body on 5098:', body);
  } finally {
    server.close();
  }
});

