import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createGatewayApp } from '../src/app';
import jwt from 'jsonwebtoken';
import { gatewayConfig } from '../src/config/env';

describe('API Gateway', () => {
  it('responds to health probe with all configured route prefixes', async () => {
    const app = createGatewayApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res = await fetch(`http://localhost:${port}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.status, 'UP');
    assert.ok(data.routes.includes('/api/v1/auth'));
    assert.ok(data.routes.includes('/api/v1/attendance'));
    assert.ok(data.routes.includes('/api/v1/payroll'));
    assert.ok(data.routes.includes('/api/v1/employees'));

    server.close();
  });

  it('strips untrusted spoofed headers and injects verified token claims', async () => {
    // Spin up a mock downstream service
    let capturedHeaders: http.IncomingHttpHeaders = {};
    const mockDownstream = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'reached downstream' }));
    });
    await new Promise<void>((resolve) => mockDownstream.listen(0, resolve));
    const downstreamPort = (mockDownstream.address() as any).port;

    // Point auth route temporarily to mock downstream
    gatewayConfig.services.auth = `http://localhost:${downstreamPort}`;

    const app = createGatewayApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const gatewayPort = (server.address() as any).port;

    // Create a verified token
    const token = jwt.sign(
      { userId: 'USR-REAL-001', role: 'EMPLOYEE', employeeId: 'EMP-REAL-001' },
      gatewayConfig.jwtSecret,
      { expiresIn: '1h' }
    );

    // Send request with spoofed x-user-id header
    const res = await fetch(`http://localhost:${gatewayPort}/api/v1/auth/protected-test`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-user-id': 'SPOOFED_ADMIN_ID', // Client trying to spoof
        'x-user-role': 'SUPER_ADMIN',    // Client trying to spoof
      },
    });

    try {
      assert.strictEqual(res.status, 200);
      assert.strictEqual(capturedHeaders['x-user-id'], 'USR-REAL-001');
      assert.strictEqual(capturedHeaders['x-user-role'], 'EMPLOYEE');
      assert.strictEqual(capturedHeaders['x-employee-id'], 'EMP-REAL-001');
    } finally {
      server.close();
      mockDownstream.close();
    }
  });
});
