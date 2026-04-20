export type UserRole = 'admin' | 'supervisor' | 'viewer';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  created_at?: string;
}

export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Defect {
  id: number;
  title: string;
  description: string;
  severity: DefectSeverity;
  status: DefectStatus;
  asset_id: number | null;
  reported_by: number;
  reporter_email?: string;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  name: string;
  type: string;
  location: string;
  created_at: string;
}
