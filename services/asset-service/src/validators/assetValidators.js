"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnAssetSchema = exports.allocateAssetSchema = exports.createAssetSchema = void 0;
const zod_1 = require("zod");
exports.createAssetSchema = {
    body: zod_1.z.object({
        assetTag: zod_1.z.string().min(2),
        category: zod_1.z.string().min(2),
        brand: zod_1.z.string().min(2),
        model: zod_1.z.string().min(1),
        serialNumber: zod_1.z.string().min(2),
        purchaseDate: zod_1.z.string().optional(),
        warrantyExpiry: zod_1.z.string().optional(),
    }),
};
exports.allocateAssetSchema = {
    body: zod_1.z.object({
        assetId: zod_1.z.string().min(1),
        employeeId: zod_1.z.string().min(1),
    }),
};
exports.returnAssetSchema = {
    body: zod_1.z.object({
        conditionOnReturn: zod_1.z.string().min(2),
    }),
};
