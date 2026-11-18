"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
const roles_1 = require("../../../../shared/src/constants/roles");
const messaging_1 = require("../../../../shared/src/infrastructure/messaging");
class AssetService {
    assetRepo;
    eventBus;
    constructor(assetRepo, eventBus) {
        this.assetRepo = assetRepo;
        this.eventBus = eventBus;
    }
    async createAsset(params, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can register hardware assets');
        }
        const existingTag = await this.assetRepo.findAssetByTag(params.assetTag);
        if (existingTag)
            throw new AppError_1.ConflictError(`Asset tag ${params.assetTag} already exists`);
        const asset = {
            id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            assetTag: params.assetTag,
            category: params.category,
            brand: params.brand,
            model: params.model,
            serialNumber: params.serialNumber,
            status: 'Available',
            custodyStatus: 'Available',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        return this.assetRepo.saveAsset(asset);
    }
    async allocateAsset(assetId, employeeId, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can allocate assets to employees');
        }
        const asset = await this.assetRepo.findAssetById(assetId);
        if (!asset)
            throw new AppError_1.NotFoundError(`Asset ${assetId} not found`);
        if (asset.status !== 'Available') {
            throw new AppError_1.ValidationError(`Asset is not available for allocation (current status: ${asset.status})`);
        }
        asset.status = 'Allocated';
        asset.currentHolderId = employeeId;
        asset.custodyStatus = 'Pending_Acknowledgement';
        asset.allocatedAt = new Date().toISOString();
        asset.updatedAt = new Date();
        const saved = await this.assetRepo.saveAsset(asset);
        if (this.eventBus) {
            await this.eventBus.publish('asset.allocated', (0, messaging_1.createEvent)('ASSET_ALLOCATED', saved.id, 'Asset', {
                assetId: saved.id,
                assetTag: saved.assetTag,
                employeeId: saved.currentHolderId,
                allocatedBy: actor.id,
            }));
        }
        return saved;
    }
    async acknowledgeAssetReceipt(assetId, actor) {
        const asset = await this.assetRepo.findAssetById(assetId);
        if (!asset)
            throw new AppError_1.NotFoundError(`Asset ${assetId} not found`);
        if (asset.currentHolderId !== actor.employeeId && actor.role !== roles_1.UserRole.HR_ADMIN) {
            throw new AppError_1.ForbiddenError('You can only acknowledge receipt of assets allocated to yourself');
        }
        asset.custodyStatus = 'In_Possession';
        asset.acknowledgedAt = new Date().toISOString();
        asset.updatedAt = new Date();
        return this.assetRepo.saveAsset(asset);
    }
    async returnAsset(assetId, conditionOnReturn, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can process asset returns and exit clearance');
        }
        const asset = await this.assetRepo.findAssetById(assetId);
        if (!asset)
            throw new AppError_1.NotFoundError(`Asset ${assetId} not found`);
        asset.status = 'Available';
        asset.currentHolderId = undefined;
        asset.custodyStatus = 'Available';
        asset.updatedAt = new Date();
        return this.assetRepo.saveAsset(asset);
    }
}
exports.AssetService = AssetService;
