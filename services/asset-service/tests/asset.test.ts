import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetService } from '../src/services/assetService';
import { InMemoryAssetRepository } from '../src/repositories/assetRepository';
import { UserRole } from '../../../shared/src/constants/roles';
import { AuthenticatedUser } from '../../../shared/src/contracts/auth';

const mockHrAdmin: AuthenticatedUser = {
  id: 'usr-hr-1',
  email: 'hr@orbyx.io',
  role: UserRole.HR_ADMIN,
  permissions: ['assets.administer'],
};

const mockEmployee: AuthenticatedUser = {
  id: 'usr-1',
  email: 'john@orbyx.io',
  role: UserRole.EMPLOYEE,
  employeeId: 'EMP-SWE-0001',
  permissions: ['assets.acknowledge_self'],
};

test('AssetService registers, allocates, acknowledges, and returns hardware asset', async () => {
  const repo = new InMemoryAssetRepository();
  const service = new AssetService(repo);

  // 1. HR Registers Laptop
  const asset = await service.createAsset(
    {
      assetTag: 'AST-LAP-099',
      category: 'Laptop',
      brand: 'Dell',
      model: 'XPS 15',
      serialNumber: 'SN-DELL-112233',
    },
    mockHrAdmin
  );
  assert.equal(asset.status, 'Available');

  // 2. HR Allocates to Employee
  const allocated = await service.allocateAsset(asset.id, 'EMP-SWE-0001', mockHrAdmin);
  assert.equal(allocated.status, 'Allocated');
  assert.equal(allocated.custodyStatus, 'Pending_Acknowledgement');
  assert.equal(allocated.currentHolderId, 'EMP-SWE-0001');

  // 3. Employee Acknowledges Receipt
  const acknowledged = await service.acknowledgeAssetReceipt(asset.id, mockEmployee);
  assert.equal(acknowledged.custodyStatus, 'In_Possession');

  // 4. Return on exit clearance
  const returned = await service.returnAsset(asset.id, 'Excellent condition, power adapter included', mockHrAdmin);
  assert.equal(returned.status, 'Available');
  assert.equal(returned.currentHolderId, undefined);
});

