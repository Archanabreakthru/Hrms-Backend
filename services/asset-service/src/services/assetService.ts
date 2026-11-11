import { IAssetRepository, HardwareAssetDTO } from '../repositories/assetRepository';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../../../shared/src/errors/AppError';
import { AuthenticatedUser } from '../../../../shared/src/contracts/auth';
import { UserRole } from '../../../../shared/src/constants/roles';
import { EventPublisher, createEvent } from '../../../../shared/src/infrastructure/messaging';

export class AssetService {
  constructor(
    private assetRepo: IAssetRepository,
    private eventBus?: EventPublisher
  ) {}

  async createAsset(
    params: {
      assetTag: string;
      category: string;
      brand: string;
      model: string;
      serialNumber: string;
    },
    actor: AuthenticatedUser
  ): Promise<HardwareAssetDTO> {
    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only HR Administrators can register hardware assets');
    }

    const existingTag = await this.assetRepo.findAssetByTag(params.assetTag);
    if (existingTag) throw new ConflictError(`Asset tag ${params.assetTag} already exists`);

    const asset: HardwareAssetDTO = {
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

  async allocateAsset(
    assetId: string,
    employeeId: string,
    actor: AuthenticatedUser
  ): Promise<HardwareAssetDTO> {
    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only HR Administrators can allocate assets to employees');
    }

    const asset = await this.assetRepo.findAssetById(assetId);
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`);

    if (asset.status !== 'Available') {
      throw new ValidationError(`Asset is not available for allocation (current status: ${asset.status})`);
    }

    asset.status = 'Allocated';
    asset.currentHolderId = employeeId;
    asset.custodyStatus = 'Pending_Acknowledgement';
    asset.allocatedAt = new Date().toISOString();
    asset.updatedAt = new Date();

    const saved = await this.assetRepo.saveAsset(asset);

    if (this.eventBus) {
      await this.eventBus.publish(
        'asset.allocated',
        createEvent('ASSET_ALLOCATED', saved.id, 'Asset', {
          assetId: saved.id,
          assetTag: saved.assetTag,
          employeeId: saved.currentHolderId,
          allocatedBy: actor.id,
        })
      );
    }

    return saved;
  }

  async acknowledgeAssetReceipt(
    assetId: string,
    actor: AuthenticatedUser
  ): Promise<HardwareAssetDTO> {
    const asset = await this.assetRepo.findAssetById(assetId);
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`);

    if (asset.currentHolderId !== actor.employeeId && actor.role !== UserRole.HR_ADMIN) {
      throw new ForbiddenError('You can only acknowledge receipt of assets allocated to yourself');
    }

    asset.custodyStatus = 'In_Possession';
    asset.acknowledgedAt = new Date().toISOString();
    asset.updatedAt = new Date();

    return this.assetRepo.saveAsset(asset);
  }

  async returnAsset(
    assetId: string,
    conditionOnReturn: string,
    actor: AuthenticatedUser
  ): Promise<HardwareAssetDTO> {
    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only HR Administrators can process asset returns and exit clearance');
    }

    const asset = await this.assetRepo.findAssetById(assetId);
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`);

    asset.status = 'Available';
    asset.currentHolderId = undefined;
    asset.custodyStatus = 'Available';
    asset.updatedAt = new Date();

    return this.assetRepo.saveAsset(asset);
  }
}

