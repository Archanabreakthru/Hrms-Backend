"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const node_http_1 = __importDefault(require("node:http"));
const app_1 = require("../src/app");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../src/config/env");
(0, node_test_1.describe)('API Gateway', () => {
    (0, node_test_1.it)('responds to health probe with all configured route prefixes', async () => {
        const app = (0, app_1.createGatewayApp)();
        const server = node_http_1.default.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        const port = server.address().port;
        const res = await fetch(`http://localhost:${port}/health`);
        node_assert_1.default.strictEqual(res.status, 200);
        const data = await res.json();
        node_assert_1.default.strictEqual(data.status, 'UP');
        node_assert_1.default.ok(data.routes.includes('/api/v1/auth'));
        node_assert_1.default.ok(data.routes.includes('/api/v1/attendance'));
        node_assert_1.default.ok(data.routes.includes('/api/v1/payroll'));
        node_assert_1.default.ok(data.routes.includes('/api/v1/employees'));
        server.close();
    });
    (0, node_test_1.it)('strips untrusted spoofed headers and injects verified token claims', async () => {
        // Spin up a mock downstream service
        let capturedHeaders = {};
        const mockDownstream = node_http_1.default.createServer((req, res) => {
            capturedHeaders = req.headers;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'reached downstream' }));
        });
        await new Promise((resolve) => mockDownstream.listen(0, resolve));
        const downstreamPort = mockDownstream.address().port;
        // Point auth route temporarily to mock downstream
        env_1.gatewayConfig.services.auth = `http://localhost:${downstreamPort}`;
        const app = (0, app_1.createGatewayApp)();
        const server = node_http_1.default.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        const gatewayPort = server.address().port;
        // Create a verified token
        const token = jsonwebtoken_1.default.sign({ userId: 'USR-REAL-001', role: 'EMPLOYEE', employeeId: 'EMP-REAL-001' }, env_1.gatewayConfig.jwtSecret, { expiresIn: '1h' });
        // Send request with spoofed x-user-id header
        const res = await fetch(`http://localhost:${gatewayPort}/api/v1/auth/protected-test`, {
            headers: {
                authorization: `Bearer ${token}`,
                'x-user-id': 'SPOOFED_ADMIN_ID', // Client trying to spoof
                'x-user-role': 'SUPER_ADMIN', // Client trying to spoof
            },
        });
        try {
            node_assert_1.default.strictEqual(res.status, 200);
            node_assert_1.default.strictEqual(capturedHeaders['x-user-id'], 'USR-REAL-001');
            node_assert_1.default.strictEqual(capturedHeaders['x-user-role'], 'EMPLOYEE');
            node_assert_1.default.strictEqual(capturedHeaders['x-employee-id'], 'EMP-REAL-001');
        }
        finally {
            server.close();
            mockDownstream.close();
        }
    });
});
