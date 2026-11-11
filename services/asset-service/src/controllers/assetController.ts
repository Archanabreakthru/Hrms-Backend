import { Request, Response, NextFunction } from 'express';
import { AssetService } from '../services/assetService';
import { apiSuccess } from '../../../../shared/src/utilities/apiResponse';

export class AssetController {
  constructor(private assetService: AssetService) {}

  createAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asset = await this.assetService.createAsset(req.body, req.user!);
      apiSuccess(res, asset, 201);
    } catch (err) {
      next(err);
    }
  };

  allocateAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { assetId, employeeId } = req.body;
      const asset = await this.assetService.allocateAsset(assetId, employeeId, req.user!);
      apiSuccess(res, asset, 200);
    } catch (err) {
      next(err);
    }
  };

  acknowledge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asset = await this.assetService.acknowledgeAssetReceipt(req.params.id, req.user!);
      apiSuccess(res, asset, 200);
    } catch (err) {
      next(err);
    }
  };

  returnAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conditionOnReturn } = req.body;
      const asset = await this.assetService.returnAsset(req.params.id, conditionOnReturn, req.user!);
      apiSuccess(res, asset, 200);
    } catch (err) {
      next(err);
    }
  };
}

