import { config } from '../config/env';

export interface IOrgServiceClient {
  getDesignationCode(designationId?: string): Promise<string>;
  validateDepartment(departmentId: string): Promise<boolean>;
  validateDesignation(designationId: string): Promise<boolean>;
  validateBranch(branchId: string): Promise<boolean>;
}

export class OrgServiceClient implements IOrgServiceClient {
  constructor(private baseUrl: string = config.orgServiceUrl) {}

  async getDesignationCode(designationId?: string): Promise<string> {
    if (!designationId) return 'GEN';
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/org/designations/derive-code?designationId=${encodeURIComponent(designationId)}`);
      if (!res.ok) return 'GEN';
      const json: any = await res.json();
      return json?.data?.code || 'GEN';
    } catch {
      return 'GEN'; // Resilient fallback
    }
  }

  async validateDepartment(departmentId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/org/departments`);
      if (!res.ok) return false;
      const json: any = await res.json();
      const depts = json?.data || [];
      return depts.some((d: any) => d.id === departmentId);
    } catch {
      return false;
    }
  }

  async validateDesignation(designationId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/org/designations`);
      if (!res.ok) return false;
      const json: any = await res.json();
      const desigs = json?.data || [];
      return desigs.some((d: any) => d.id === designationId);
    } catch {
      return false;
    }
  }

  async validateBranch(branchId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/org/branches`);
      if (!res.ok) return false;
      const json: any = await res.json();
      const branches = json?.data || [];
      return branches.some((b: any) => b.id === branchId);
    } catch {
      return false;
    }
  }
}

