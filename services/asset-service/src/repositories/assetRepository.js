"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAssetRepository = void 0;
class InMemoryAssetRepository {
    assets = new Map();
    constructor() {
        // Zero mock assets: clean start
    }
    async findAssetById(id) {
        return this.assets.get(id) || null;
    }
    async findAssetByTag(tag) {
        for (const a of this.assets.values()) {
            if (a.assetTag === tag)
                return a;
        }
        return null;
    }
    async listAssets(filter) {
        let list = Array.from(this.assets.values());
        if (filter.status)
            list = list.filter((a) => a.status === filter.status);
        if (filter.currentHolderId)
            list = list.filter((a) => a.currentHolderId === filter.currentHolderId);
        return list;
    }
    async saveAsset(asset) {
        this.assets.set(asset.id, { ...asset });
        return asset;
    }
}
exports.InMemoryAssetRepository = InMemoryAssetRepository;
