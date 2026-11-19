import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface IOrgServiceClient {
  getDesignationCode(designationId?: string): Promise<string>;
  validateDepartment(departmentId?: string): Promise<boolean>;
  validateDesignation(designationId?: string): Promise<boolean>;
  validateBranch(branchId?: string): Promise<boolean>;
  resolveDepartmentId(departmentId?: string): Promise<string | null>;
  resolveDesignationId(designationId?: string): Promise<string | null>;
  resolveBranchId(branchId?: string): Promise<string | null>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrgServiceClient implements IOrgServiceClient {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private baseUrl: string = config.orgServiceUrl) {}

  private getAuthHeaders(): Record<string, string> {
    const now = Date.now();
    if (!this.cachedToken || now >= this.tokenExpiresAt) {
      this.cachedToken = jwt.sign(
        { sub: 'employee-service', role: 'super_admin' },
        config.jwtSecret,
        {
          issuer: config.jwtIssuer,
          audience: config.jwtAudience,
          expiresIn: '1h',
        }
      );
      this.tokenExpiresAt = now + 50 * 60 * 1000; // 50 minutes
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.cachedToken}`,
    };
  }

  async getDesignationCode(designationId?: string): Promise<string> {
    if (!designationId) return 'GEN';
    try {
      const res = await fetch(
        `${this.baseUrl}/api/v1/org/designations/derive-code?designationId=${encodeURIComponent(designationId)}`,
        { headers: this.getAuthHeaders() }
      );
      if (res.ok) {
        const json: any = await res.json();
        if (json?.data?.code) return json.data.code;
      }

      // If derive-code fails or doesn't match, check designations list
      const desigs = await this.getDesignationsList();
      const clean = designationId.toLowerCase().trim();
      const match = desigs.find(
        (d: any) =>
          d.id === designationId ||
          d.code?.toLowerCase() === clean ||
          d.title?.toLowerCase() === clean
      );
      if (match?.code) return match.code;

      return 'GEN';
    } catch {
      return 'GEN'; // Resilient fallback
    }
  }

  private async getDepartmentsList(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/org/departments`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return [];
      const json: any = await res.json();
      return json?.data || [];
    } catch {
      return [];
    }
  }

  private async getDesignationsList(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/org/designations`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return [];
      const json: any = await res.json();
      return json?.data || [];
    } catch {
      return [];
    }
  }

  private async getBranchesList(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/org/branches`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return [];
      const json: any = await res.json();
      return json?.data || [];
    } catch {
      return [];
    }
  }

  async validateDepartment(departmentId?: string): Promise<boolean> {
    if (!departmentId || departmentId === 'unassigned') return true;
    try {
      const clean = departmentId.toLowerCase().trim();
      const depts = await this.getDepartmentsList();
      if (depts.length === 0) return true; // Resilient fallback if service unavailable
      return depts.some(
        (d: any) =>
          d.id === departmentId ||
          d.code?.toLowerCase() === clean ||
          d.name?.toLowerCase() === clean
      );
    } catch {
      return true; // Resilient fallback
    }
  }

  async validateDesignation(designationId?: string): Promise<boolean> {
    if (!designationId || designationId === 'unassigned') return true;
    try {
      const clean = designationId.toLowerCase().trim();
      const desigs = await this.getDesignationsList();
      if (desigs.length === 0) return true; // Resilient fallback if service unavailable
      return desigs.some(
        (d: any) =>
          d.id === designationId ||
          d.code?.toLowerCase() === clean ||
          d.title?.toLowerCase() === clean
      );
    } catch {
      return true; // Resilient fallback
    }
  }

  async validateBranch(branchId?: string): Promise<boolean> {
    if (!branchId || branchId === 'unassigned') return true;
    try {
      const clean = branchId.toLowerCase().trim();
      const branches = await this.getBranchesList();
      if (branches.length === 0) return true; // Resilient fallback if service unavailable
      return branches.some(
        (b: any) =>
          b.id === branchId ||
          b.code?.toLowerCase() === clean ||
          b.name?.toLowerCase() === clean
      );
    } catch {
      return true; // Resilient fallback
    }
  }

  async resolveDepartmentId(departmentId?: string): Promise<string | null> {
    if (!departmentId || departmentId === 'unassigned') return null;
    if (UUID_REGEX.test(departmentId.trim())) return departmentId.trim();
    try {
      const clean = departmentId.toLowerCase().trim();
      const depts = await this.getDepartmentsList();
      const match = depts.find(
        (d: any) => d.code?.toLowerCase() === clean || d.name?.toLowerCase() === clean
      );
      return match?.id || null;
    } catch {
      return null;
    }
  }

  async resolveDesignationId(designationId?: string): Promise<string | null> {
    if (!designationId || designationId === 'unassigned') return null;
    if (UUID_REGEX.test(designationId.trim())) return designationId.trim();
    try {
      const clean = designationId.toLowerCase().trim();
      const desigs = await this.getDesignationsList();
      const match = desigs.find(
        (d: any) => d.code?.toLowerCase() === clean || d.title?.toLowerCase() === clean
      );
      return match?.id || null;
    } catch {
      return null;
    }
  }

  async resolveBranchId(branchId?: string): Promise<string | null> {
    if (!branchId || branchId === 'unassigned') return null;
    if (UUID_REGEX.test(branchId.trim())) return branchId.trim();
    try {
      const clean = branchId.toLowerCase().trim();
      const branches = await this.getBranchesList();
      const match = branches.find(
        (b: any) => b.code?.toLowerCase() === clean || b.name?.toLowerCase() === clean
      );
      return match?.id || null;
    } catch {
      return null;
    }
  }
}
