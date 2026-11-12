"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceRoutes = getServiceRoutes;
exports.forwardRequest = forwardRequest;
exports.createGatewayRouter = createGatewayRouter;
const express_1 = require("express");
const env_1 = require("../config/env");
function getServiceRoutes() {
    return [
        { prefix: '/api/v1/auth', targetServiceUrl: env_1.gatewayConfig.services.auth },
        { prefix: '/api/v1/organization', targetServiceUrl: env_1.gatewayConfig.services.organization },
        { prefix: '/api/v1/attendance', targetServiceUrl: env_1.gatewayConfig.services.attendance },
        { prefix: '/api/v1/payroll', targetServiceUrl: env_1.gatewayConfig.services.payroll },
        { prefix: '/api/v1/expenses', targetServiceUrl: env_1.gatewayConfig.services.expense },
        { prefix: '/api/v1/assets', targetServiceUrl: env_1.gatewayConfig.services.asset },
        { prefix: '/api/v1/clients', targetServiceUrl: env_1.gatewayConfig.services.client },
        { prefix: '/api/v1/notifications', targetServiceUrl: env_1.gatewayConfig.services.notification },
        { prefix: '/api/v1/audit', targetServiceUrl: env_1.gatewayConfig.services.notification },
        { prefix: '/api/v1/employees', targetServiceUrl: env_1.gatewayConfig.services.employee },
    ];
}
/**
 * Dispatches an HTTP request to the downstream microservice with full header propagation.
 */
async function forwardRequest(req, res, targetBaseUrl) {
    const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
    const correlationId = req.correlationId;
    const headers = {
        'content-type': req.headers['content-type'] || 'application/json',
        'x-correlation-id': correlationId || req.headers['x-correlation-id'] || '',
    };
    if (req.headers.authorization)
        headers['authorization'] = req.headers.authorization;
    if (req.headers['x-user-id'])
        headers['x-user-id'] = req.headers['x-user-id'];
    if (req.headers['x-user-role'])
        headers['x-user-role'] = req.headers['x-user-role'];
    if (req.headers['x-employee-id'])
        headers['x-employee-id'] = req.headers['x-employee-id'];
    if (req.headers['x-tenant-id'])
        headers['x-tenant-id'] = req.headers['x-tenant-id'];
    if (req.headers['x-client-id'])
        headers['x-client-id'] = req.headers['x-client-id'];
    try {
        const fetchOptions = {
            method: req.method,
            headers,
        };
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
            fetchOptions.body = JSON.stringify(req.body);
        }
        const response = await fetch(targetUrl, fetchOptions);
        const contentType = response.headers.get('content-type') || '';
        res.status(response.status);
        if (contentType.includes('application/json')) {
            const data = await response.json();
            return res.json(data);
        }
        else {
            const text = await response.text();
            return res.send(text);
        }
    }
    catch (err) {
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: `Downstream service at ${targetBaseUrl} is unreachable`,
                details: err?.message,
            },
        });
    }
}
function createGatewayRouter() {
    const router = (0, express_1.Router)();
    for (const route of getServiceRoutes()) {
        router.all(`${route.prefix}*`, async (req, res) => {
            // Look up current dynamic target in case config changed (e.g., in test or runtime rebind)
            const currentRoute = getServiceRoutes().find((r) => r.prefix === route.prefix);
            const targetUrl = currentRoute ? currentRoute.targetServiceUrl : route.targetServiceUrl;
            await forwardRequest(req, res, targetUrl);
        });
    }
    return router;
}
