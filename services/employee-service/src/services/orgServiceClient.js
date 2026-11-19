"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgServiceClient = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class OrgServiceClient {
    baseUrl;
    cachedToken = null;
    tokenExpiresAt = 0;
    constructor(baseUrl = env_1.config.orgServiceUrl) {
        this.baseUrl = baseUrl;
    }
    getAuthHeaders() {
        const now = Date.now();
        if (!this.cachedToken || now >= this.tokenExpiresAt) {
            this.cachedToken = jsonwebtoken_1.default.sign({ sub: 'employee-service', role: 'super_admin' }, env_1.config.jwtSecret, {
                issuer: env_1.config.jwtIssuer,
                audience: env_1.config.jwtAudience,
                expiresIn: '1h',
            });
            this.tokenExpiresAt = now + 50 * 60 * 1000; // 50 minutes
        }
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.cachedToken}`,
        };
    }
    async getDesignationCode(designationId) {
        if (!designationId)
            return 'GEN';
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/designations/derive-code?designationId=${encodeURIComponent(designationId)}`, { headers: this.getAuthHeaders() });
            if (res.ok) {
                const json = await res.json();
                if (json?.data?.code)
                    return json.data.code;
            }
            // If derive-code fails or doesn't match, check designations list
            const desigs = await this.getDesignationsList();
            const clean = designationId.toLowerCase().trim();
            const match = desigs.find((d) => d.id === designationId ||
                d.code?.toLowerCase() === clean ||
                d.title?.toLowerCase() === clean);
            if (match?.code)
                return match.code;
            return 'GEN';
        }
        catch {
            return 'GEN'; // Resilient fallback
        }
    }
    async getDepartmentsList() {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/departments`, {
                headers: this.getAuthHeaders(),
            });
            if (!res.ok)
                return [];
            const json = await res.json();
            return json?.data || [];
        }
        catch {
            return [];
        }
    }
    async getDesignationsList() {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/designations`, {
                headers: this.getAuthHeaders(),
            });
            if (!res.ok)
                return [];
            const json = await res.json();
            return json?.data || [];
        }
        catch {
            return [];
        }
    }
    async getBranchesList() {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/org/branches`, {
                headers: this.getAuthHeaders(),
            });
            if (!res.ok)
                return [];
            const json = await res.json();
            return json?.data || [];
        }
        catch {
            return [];
        }
    }
    async validateDepartment(departmentId) {
        if (!departmentId || departmentId === 'unassigned')
            return true;
        try {
            const clean = departmentId.toLowerCase().trim();
            const depts = await this.getDepartmentsList();
            if (depts.length === 0)
                return true; // Resilient fallback if service unavailable
            return depts.some((d) => d.id === departmentId ||
                d.code?.toLowerCase() === clean ||
                d.name?.toLowerCase() === clean);
        }
        catch {
            return true; // Resilient fallback
        }
    }
    async validateDesignation(designationId) {
        if (!designationId || designationId === 'unassigned')
            return true;
        try {
            const clean = designationId.toLowerCase().trim();
            const desigs = await this.getDesignationsList();
            if (desigs.length === 0)
                return true; // Resilient fallback if service unavailable
            return desigs.some((d) => d.id === designationId ||
                d.code?.toLowerCase() === clean ||
                d.title?.toLowerCase() === clean);
        }
        catch {
            return true; // Resilient fallback
        }
    }
    async validateBranch(branchId) {
        if (!branchId || branchId === 'unassigned')
            return true;
        try {
            const clean = branchId.toLowerCase().trim();
            const branches = await this.getBranchesList();
            if (branches.length === 0)
                return true; // Resilient fallback if service unavailable
            return branches.some((b) => b.id === branchId ||
                b.code?.toLowerCase() === clean ||
                b.name?.toLowerCase() === clean);
        }
        catch {
            return true; // Resilient fallback
        }
    }
    async resolveDepartmentId(departmentId) {
        if (!departmentId || departmentId === 'unassigned')
            return null;
        if (UUID_REGEX.test(departmentId.trim()))
            return departmentId.trim();
        try {
            const clean = departmentId.toLowerCase().trim();
            const depts = await this.getDepartmentsList();
            const match = depts.find((d) => d.code?.toLowerCase() === clean || d.name?.toLowerCase() === clean);
            return match?.id || null;
        }
        catch {
            return null;
        }
    }
    async resolveDesignationId(designationId) {
        if (!designationId || designationId === 'unassigned')
            return null;
        if (UUID_REGEX.test(designationId.trim()))
            return designationId.trim();
        try {
            const clean = designationId.toLowerCase().trim();
            const desigs = await this.getDesignationsList();
            const match = desigs.find((d) => d.code?.toLowerCase() === clean || d.title?.toLowerCase() === clean);
            return match?.id || null;
        }
        catch {
            return null;
        }
    }
    async resolveBranchId(branchId) {
        if (!branchId || branchId === 'unassigned')
            return null;
        if (UUID_REGEX.test(branchId.trim()))
            return branchId.trim();
        try {
            const clean = branchId.toLowerCase().trim();
            const branches = await this.getBranchesList();
            const match = branches.find((b) => b.code?.toLowerCase() === clean || b.name?.toLowerCase() === clean);
            return match?.id || null;
        }
        catch {
            return null;
        }
    }
}
exports.OrgServiceClient = OrgServiceClient;
