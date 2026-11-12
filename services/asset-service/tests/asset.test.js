"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const assetService_1 = require("../src/services/assetService");
const assetRepository_1 = require("../src/repositories/assetRepository");
const roles_1 = require("../../../shared/src/constants/roles");
const mockHrAdmin = {
    id: 'usr-hr-1',
    email: 'hr@orbyx.io',
    role: roles_1.UserRole.HR_ADMIN,
    permissions: ['assets.administer'],
};
const mockEmployee = {
    id: 'usr-1',
    email: 'john@orbyx.io',
    role: roles_1.UserRole.EMPLOYEE,
    employeeId: 'EMP-SWE-0001',
    permissions: ['assets.acknowledge_self'],
};
(0, node_test_1.default)('AssetService registers, allocates, acknowledges, and returns hardware asset', async () => {
    const repo = new assetRepository_1.InMemoryAssetRepository();
    const service = new assetService_1.AssetService(repo);
    // 1. HR Registers Laptop
    const asset = await service.createAsset({
        assetTag: 'AST-LAP-099',
        category: 'Laptop',
        brand: 'Dell',
        model: 'XPS 15',
        serialNumber: 'SN-DELL-112233',
    }, mockHrAdmin);
    strict_1.default.equal(asset.status, 'Available');
    // 2. HR Allocates to Employee
    const allocated = await service.allocateAsset(asset.id, 'EMP-SWE-0001', mockHrAdmin);
    strict_1.default.equal(allocated.status, 'Allocated');
    strict_1.default.equal(allocated.custodyStatus, 'Pending_Acknowledgement');
    strict_1.default.equal(allocated.currentHolderId, 'EMP-SWE-0001');
    // 3. Employee Acknowledges Receipt
    const acknowledged = await service.acknowledgeAssetReceipt(asset.id, mockEmployee);
    strict_1.default.equal(acknowledged.custodyStatus, 'In_Possession');
    // 4. Return on exit clearance
    const returned = await service.returnAsset(asset.id, 'Excellent condition, power adapter included', mockHrAdmin);
    strict_1.default.equal(returned.status, 'Available');
    strict_1.default.equal(returned.currentHolderId, undefined);
});
