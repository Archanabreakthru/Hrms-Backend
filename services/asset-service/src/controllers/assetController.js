"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class AssetController {
    assetService;
    constructor(assetService) {
        this.assetService = assetService;
    }
    createAsset = async (req, res, next) => {
        try {
            const asset = await this.assetService.createAsset(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, asset, 201);
        }
        catch (err) {
            next(err);
        }
    };
    allocateAsset = async (req, res, next) => {
        try {
            const { assetId, employeeId } = req.body;
            const asset = await this.assetService.allocateAsset(assetId, employeeId, req.user);
            (0, apiResponse_1.apiSuccess)(res, asset, 200);
        }
        catch (err) {
            next(err);
        }
    };
    acknowledge = async (req, res, next) => {
        try {
            const asset = await this.assetService.acknowledgeAssetReceipt(req.params.id, req.user);
            (0, apiResponse_1.apiSuccess)(res, asset, 200);
        }
        catch (err) {
            next(err);
        }
    };
    returnAsset = async (req, res, next) => {
        try {
            const { conditionOnReturn } = req.body;
            const asset = await this.assetService.returnAsset(req.params.id, conditionOnReturn, req.user);
            (0, apiResponse_1.apiSuccess)(res, asset, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.AssetController = AssetController;
