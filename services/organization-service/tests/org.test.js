"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const orgService_1 = require("../src/services/orgService");
const orgRepository_1 = require("../src/repositories/orgRepository");
(0, node_test_1.default)('OrganizationService gets and updates company profile', async () => {
    const repo = new orgRepository_1.InMemoryOrganizationRepository();
    const service = new orgService_1.OrganizationService(repo);
    const profile = await service.getCompanyProfile();
    strict_1.default.equal(profile.legalName, 'Orbyx Technologies Private Limited');
    const updated = await service.updateCompanyProfile({
        tradingName: 'Orbyx Tech Inc.',
    });
    strict_1.default.equal(updated.tradingName, 'Orbyx Tech Inc.');
});
(0, node_test_1.default)('OrganizationService manages branches and prevents duplicate codes', async () => {
    const repo = new orgRepository_1.InMemoryOrganizationRepository();
    const service = new orgService_1.OrganizationService(repo);
    const branch = await service.createBranch({
        code: 'MUM',
        name: 'Mumbai Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        address: 'BKC, Mumbai',
        isHeadquarters: false,
    });
    strict_1.default.equal(branch.code, 'MUM');
    strict_1.default.equal(branch.id, 'BR-MUM');
    // Duplicate code rejected
    await strict_1.default.rejects(async () => {
        await service.createBranch({
            code: 'MUM',
            name: 'Another Mumbai Branch',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            address: 'Andheri East',
            isHeadquarters: false,
        });
    }, {
        name: 'ConflictError',
        message: 'Branch with code MUM already exists',
    });
});
(0, node_test_1.default)('OrganizationService derives designation codes for Employee Service sequential IDs', async () => {
    const repo = new orgRepository_1.InMemoryOrganizationRepository();
    const service = new orgService_1.OrganizationService(repo);
    const codeSWE = await service.deriveDesignationCode('DES-SWE');
    strict_1.default.equal(codeSWE, 'SWE');
    const codeMD = await service.deriveDesignationCode('DES-MD');
    strict_1.default.equal(codeMD, 'MD');
    const fallback = await service.deriveDesignationCode(undefined);
    strict_1.default.equal(fallback, 'GEN');
});
