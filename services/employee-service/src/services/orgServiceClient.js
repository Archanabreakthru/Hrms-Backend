"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgServiceClient = void 0;
const env_1 = require("../config/env");
class OrgServiceClient {
    baseUrl;
    constructor(baseUrl = env_1.config.orgServiceUrl) {
        this.baseUrl = baseUrl;
    }
    async getDesignationCode(designationId) {
        if (!designationId)
            return 'GEN';
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/designations/derive-code?designationId=${encodeURIComponent(designationId)}`);
            if (!res.ok)
                return 'GEN';
            const json = await res.json();
            return json?.data?.code || 'GEN';
        }
        catch {
            return 'GEN'; // Resilient fallback
        }
    }
    async validateDepartment(departmentId) {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/departments`);
            if (!res.ok)
                return false;
            const json = await res.json();
            const depts = json?.data || [];
            return depts.some((d) => d.id === departmentId);
        }
        catch {
            return false;
        }
    }
    async validateDesignation(designationId) {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/designations`);
            if (!res.ok)
                return false;
            const json = await res.json();
            const desigs = json?.data || [];
            return desigs.some((d) => d.id === designationId);
        }
        catch {
            return false;
        }
    }
    async validateBranch(branchId) {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/branches`);
            if (!res.ok)
                return false;
            const json = await res.json();
            const branches = json?.data || [];
            return branches.some((b) => b.id === branchId);
        }
        catch {
            return false;
        }
    }
}
exports.OrgServiceClient = OrgServiceClient;
