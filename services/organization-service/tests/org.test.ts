import test from 'node:test';
import assert from 'node:assert/strict';
import { OrganizationService } from '../src/services/orgService';
import { InMemoryOrganizationRepository } from '../src/repositories/orgRepository';

test('OrganizationService gets and updates company profile', async () => {
  const repo = new InMemoryOrganizationRepository();
  const service = new OrganizationService(repo);

  const profile = await service.getCompanyProfile();
  assert.equal(profile.legalName, 'Orbyx Technologies Private Limited');

  const updated = await service.updateCompanyProfile({
    tradingName: 'Orbyx Tech Inc.',
  });
  assert.equal(updated.tradingName, 'Orbyx Tech Inc.');
});

test('OrganizationService manages branches and prevents duplicate codes', async () => {
  const repo = new InMemoryOrganizationRepository();
  const service = new OrganizationService(repo);

  const branch = await service.createBranch({
    code: 'MUM',
    name: 'Mumbai Office',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    address: 'BKC, Mumbai',
    isHeadquarters: false,
  });

  assert.equal(branch.code, 'MUM');
  assert.equal(branch.id, 'BR-MUM');

  // Duplicate code rejected
  await assert.rejects(
    async () => {
      await service.createBranch({
        code: 'MUM',
        name: 'Another Mumbai Branch',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        address: 'Andheri East',
        isHeadquarters: false,
      });
    },
    {
      name: 'ConflictError',
      message: 'Branch with code MUM already exists',
    }
  );
});

test('OrganizationService derives designation codes for Employee Service sequential IDs', async () => {
  const repo = new InMemoryOrganizationRepository();
  const service = new OrganizationService(repo);

  const codeSWE = await service.deriveDesignationCode('DES-SWE');
  assert.equal(codeSWE, 'SWE');

  const codeMD = await service.deriveDesignationCode('DES-MD');
  assert.equal(codeMD, 'MD');

  const fallback = await service.deriveDesignationCode(undefined);
  assert.equal(fallback, 'GEN');
});

test('OrganizationService manages statutory compliance and branch/dept/desig updates', async () => {
  const repo = new InMemoryOrganizationRepository();
  const service = new OrganizationService(repo);

  // Statutory configuration
  const statutory = await service.getStatutoryConfig();
  assert.equal(statutory.epfApplicable, true);
  assert.equal(statutory.epfEmployeeRatePercent, 12);

  const updatedStat = await service.updateStatutoryConfig({
    epfEmployeeRatePercent: 10,
    esiApplicable: false,
  });
  assert.equal(updatedStat.epfEmployeeRatePercent, 10);
  assert.equal(updatedStat.esiApplicable, false);

  // Branch update and status toggle
  const updatedBranch = await service.updateBranch('BR-BLR', { name: 'Bengaluru Global Campus' });
  assert.equal(updatedBranch.name, 'Bengaluru Global Campus');

  const toggledBranch = await service.toggleBranchStatus('BR-BLR', false);
  assert.equal(toggledBranch.status, 'Inactive');

  // Department update and status toggle
  const updatedDept = await service.updateDepartment('DEP-ENG', { name: 'Core Platform Engineering' });
  assert.equal(updatedDept.name, 'Core Platform Engineering');

  const toggledDept = await service.toggleDepartmentStatus('DEP-ENG', false);
  assert.equal(toggledDept.status, 'Inactive');

  // Designation update and status toggle
  const updatedDesig = await service.updateDesignation('DES-SWE', { title: 'Principal Engineer', level: 6 });
  assert.equal(updatedDesig.title, 'Principal Engineer');
  assert.equal(updatedDesig.level, 6);

  const toggledDesig = await service.toggleDesignationStatus('DES-SWE', false);
  assert.equal(toggledDesig.status, 'Inactive');
});

