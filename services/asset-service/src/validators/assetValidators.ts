import { z } from 'zod';

export const createAssetSchema = {
  body: z.object({
    assetTag: z.string().min(2),
    category: z.string().min(2),
    brand: z.string().min(2),
    model: z.string().min(1),
    serialNumber: z.string().min(2),
    purchaseDate: z.string().optional(),
    warrantyExpiry: z.string().optional(),
  }),
};

export const allocateAssetSchema = {
  body: z.object({
    assetId: z.string().min(1),
    employeeId: z.string().min(1),
  }),
};

export const returnAssetSchema = {
  body: z.object({
    conditionOnReturn: z.string().min(2),
  }),
};

