"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetRouter = createAssetRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const assetValidators_1 = require("../validators/assetValidators");
const env_1 = require("../config/env");
function createAssetRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // Register Asset (HR Admin)
    router.post('/', authMiddleware, (0, auth_1.requirePermission)('assets.administer'), (0, validation_1.validateRequest)(assetValidators_1.createAssetSchema), controller.createAsset);
    // Allocate Asset (HR Admin)
    router.post('/allocate', authMiddleware, (0, auth_1.requirePermission)('assets.administer'), (0, validation_1.validateRequest)(assetValidators_1.allocateAssetSchema), controller.allocateAsset);
    // Acknowledge Receipt (Self)
    router.post('/:id/acknowledge', authMiddleware, (0, auth_1.requirePermission)('assets.acknowledge_self'), controller.acknowledge);
    // Process Return (HR Admin)
    router.post('/:id/return', authMiddleware, (0, auth_1.requirePermission)('assets.administer'), (0, validation_1.validateRequest)(assetValidators_1.returnAssetSchema), controller.returnAsset);
    return router;
}
