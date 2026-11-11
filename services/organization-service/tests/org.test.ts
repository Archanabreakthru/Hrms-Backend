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

