export interface HardwareAssetDTO {
  id: string;
  assetTag: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: 'Available' | 'Allocated' | 'In_Maintenance' | 'Damaged' | 'Retired';
  currentHolderId?: string;
  custodyStatus: 'Pending_Acknowledgement' | 'In_Possession' | 'Returned' | 'Available';
  allocatedAt?: string;
  acknowledgedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssetRepository {
  findAssetById(id: string): Promise<HardwareAssetDTO | null>;
  findAssetByTag(tag: string): Promise<HardwareAssetDTO | null>;
  listAssets(filter: { status?: string; currentHolderId?: string }): Promise<HardwareAssetDTO[]>;
  saveAsset(asset: HardwareAssetDTO): Promise<HardwareAssetDTO>;
}

export class InMemoryAssetRepository implements IAssetRepository {
  private assets = new Map<string, HardwareAssetDTO>();

  constructor() {
    // Zero mock assets: clean start
  }

  async findAssetById(id: string): Promise<HardwareAssetDTO | null> {
    return this.assets.get(id) || null;
  }

  async findAssetByTag(tag: string): Promise<HardwareAssetDTO | null> {
    for (const a of this.assets.values()) {
      if (a.assetTag === tag) return a;
    }
    return null;
  }

  async listAssets(filter: { status?: string; currentHolderId?: string }): Promise<HardwareAssetDTO[]> {
    let list = Array.from(this.assets.values());
    if (filter.status) list = list.filter((a) => a.status === filter.status);
    if (filter.currentHolderId) list = list.filter((a) => a.currentHolderId === filter.currentHolderId);
    return list;
  }

  async saveAsset(asset: HardwareAssetDTO): Promise<HardwareAssetDTO> {
    this.assets.set(asset.id, { ...asset });
    return asset;
  }
}

