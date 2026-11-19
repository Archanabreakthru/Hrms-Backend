"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAssetRepository = void 0;
class PrismaAssetRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapRow(r) {
        return {
            id: r.id,
            assetTag: r.asset_tag || r.assetTag,
            category: r.category_name || r.category || 'Hardware',
            brand: r.brand || '',
            model: r.model || '',
            serialNumber: r.serial_number || r.serialNumber || '',
            status: (r.status || 'Available'),
            currentHolderId: r.current_employee_id || r.currentHolderId || undefined,
            custodyStatus: (r.custody_status || r.custodyStatus || 'Available'),
            allocatedAt: r.allocated_at ? new Date(r.allocated_at).toISOString() : undefined,
            acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at).toISOString() : undefined,
            createdAt: r.created_at ? new Date(r.created_at) : new Date(),
            updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
        };
    }
    async findAssetById(id) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const rows = (await q(`SELECT * FROM asset.assets WHERE id = $1::uuid OR id::text = $1 LIMIT 1`, id));
        if (!rows || rows.length === 0)
            return null;
        return this.mapRow(rows[0]);
    }
    async findAssetByTag(tag) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        const rows = (await q(`SELECT * FROM asset.assets WHERE LOWER(asset_tag) = LOWER($1) LIMIT 1`, tag));
        if (!rows || rows.length === 0)
            return null;
        return this.mapRow(rows[0]);
    }
    async listAssets(filter) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        let query = `SELECT * FROM asset.assets WHERE is_active = true`;
        const params = [];
        if (filter.status) {
            params.push(filter.status);
            query += ` AND status = $${params.length}`;
        }
        if (filter.currentHolderId) {
            params.push(filter.currentHolderId);
            query += ` AND current_employee_id = $${params.length}`;
        }
        query += ` ORDER BY created_at DESC`;
        const rows = (await q(query, ...params));
        return rows.map((r) => this.mapRow(r));
    }
    async saveAsset(asset) {
        const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
        await q(`INSERT INTO asset.assets (
        id, asset_tag, asset_name, category_name, brand, model, serial_number,
        status, current_employee_id, custody_status, allocated_at, acknowledged_at,
        is_active, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11::timestamptz, $12::timestamptz,
        true, CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        asset_tag = EXCLUDED.asset_tag,
        asset_name = EXCLUDED.asset_name,
        category_name = EXCLUDED.category_name,
        brand = EXCLUDED.brand,
        model = EXCLUDED.model,
        serial_number = EXCLUDED.serial_number,
        status = EXCLUDED.status,
        current_employee_id = EXCLUDED.current_employee_id,
        custody_status = EXCLUDED.custody_status,
        allocated_at = EXCLUDED.allocated_at,
        acknowledged_at = EXCLUDED.acknowledged_at,
        updated_at = CURRENT_TIMESTAMP`, asset.id, asset.assetTag, `${asset.brand} ${asset.model}`.trim() || asset.assetTag, asset.category, asset.brand, asset.model, asset.serialNumber, asset.status, asset.currentHolderId || null, asset.custodyStatus, asset.allocatedAt || null, asset.acknowledgedAt || null);
        return asset;
    }
}
exports.PrismaAssetRepository = PrismaAssetRepository;
