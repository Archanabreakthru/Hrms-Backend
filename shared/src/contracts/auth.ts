import { UserRole, Permission } from '../constants/roles';

export interface JwtTokenPayload {
  sub: string;               // User ID (or client supervisor ID)
  email: string;
  role: UserRole;
  username?: string;
  name?: string;
  employeeId?: string;       // Linked employee ID for internal company users
  departmentId?: string;     // Department ID
  clientId?: string;         // Present only for external client supervisor accounts
  permissions: Permission[];
  iss: string;               // Must match 'orbyx-auth-service'
  aud: string;               // Must match 'orbyx-hrms-client'
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  username?: string;
  name?: string;
  employeeId?: string;
  departmentId?: string;
  clientId?: string;
  permissions: Permission[];
}

