import { Router, Request, Response } from 'express';
import { gatewayConfig } from '../config/env';

export interface RouteTarget {
  prefix: string;
  targetServiceUrl: string;
}

export function getServiceRoutes(): RouteTarget[] {
  return [
    { prefix: '/api/v1/auth', targetServiceUrl: gatewayConfig.services.auth },
    { prefix: '/api/v1/organization', targetServiceUrl: gatewayConfig.services.organization },
    { prefix: '/api/v1/attendance', targetServiceUrl: gatewayConfig.services.attendance },
    { prefix: '/api/v1/payroll', targetServiceUrl: gatewayConfig.services.payroll },
    { prefix: '/api/v1/expenses', targetServiceUrl: gatewayConfig.services.expense },
    { prefix: '/api/v1/assets', targetServiceUrl: gatewayConfig.services.asset },
    { prefix: '/api/v1/clients', targetServiceUrl: gatewayConfig.services.client },
    { prefix: '/api/v1/notifications', targetServiceUrl: gatewayConfig.services.notification },
    { prefix: '/api/v1/audit', targetServiceUrl: gatewayConfig.services.notification },
    { prefix: '/api/v1/employees', targetServiceUrl: gatewayConfig.services.employee },
  ];
}

/**
 * Dispatches an HTTP request to the downstream microservice with full header propagation.
 */
export async function forwardRequest(req: Request, res: Response, targetBaseUrl: string) {
  const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
  const correlationId = (req as any).correlationId;

  const headers: Record<string, string> = {
    'content-type': req.headers['content-type'] || 'application/json',
    'x-correlation-id': correlationId || (req.headers['x-correlation-id'] as string) || '',
  };

  if (req.headers.authorization) headers['authorization'] = req.headers.authorization as string;
  if (req.headers['x-user-id']) headers['x-user-id'] = req.headers['x-user-id'] as string;
  if (req.headers['x-user-role']) headers['x-user-role'] = req.headers['x-user-role'] as string;
  if (req.headers['x-employee-id']) headers['x-employee-id'] = req.headers['x-employee-id'] as string;
  if (req.headers['x-tenant-id']) headers['x-tenant-id'] = req.headers['x-tenant-id'] as string;
  if (req.headers['x-client-id']) headers['x-client-id'] = req.headers['x-client-id'] as string;

  try {
    const fetchOptions: RequestInit = {
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
    } else {
      const text = await response.text();
      return res.send(text);
    }
  } catch (err: any) {
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

export function createGatewayRouter(): Router {
  const router = Router();

  for (const route of getServiceRoutes()) {
    router.all(`${route.prefix}*`, async (req: Request, res: Response) => {
      // Look up current dynamic target in case config changed (e.g., in test or runtime rebind)
      const currentRoute = getServiceRoutes().find((r) => r.prefix === route.prefix);
      const targetUrl = currentRoute ? currentRoute.targetServiceUrl : route.targetServiceUrl;
      await forwardRequest(req, res, targetUrl);
    });
  }

  return router;
}
