import { Router } from 'express';
import { AssetController } from '../controllers/assetController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import { createAssetSchema, allocateAssetSchema, returnAssetSchema } from '../validators/assetValidators';
import { config } from '../config/env';

export function createAssetRouter(controller: AssetController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, config.jwtIssuer, config.jwtAudience);

  // Register Asset (HR Admin)
  router.post(
    '/',
    authMiddleware,
    requirePermission('assets.administer'),
    validateRequest(createAssetSchema),
    controller.createAsset
  );

  // Allocate Asset (HR Admin)
  router.post(
    '/allocate',
    authMiddleware,
    requirePermission('assets.administer'),
    validateRequest(allocateAssetSchema),
    controller.allocateAsset
  );

  // Acknowledge Receipt (Self)
  router.post(
    '/:id/acknowledge',
    authMiddleware,
    requirePermission('assets.acknowledge_self'),
    controller.acknowledge
  );

  // Process Return (HR Admin)
  router.post(
    '/:id/return',
    authMiddleware,
    requirePermission('assets.administer'),
    validateRequest(returnAssetSchema),
    controller.returnAsset
  );

  return router;
}

