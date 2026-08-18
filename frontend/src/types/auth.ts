export interface UserProfile {
  company?: string | null;
  data_scope?: string | null;
  phone?: string | null;
  pin_code?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  profile?: UserProfile;
  roles: string[];
  role_ids: number[];
  effective_permissions: string[];
}

export interface Permission {
  id: number;
  name: string;
  codename: string;
  app_label: string;
}

export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
  permission_ids?: number[];
  user_count: number;
}

export interface CreateRoleData {
  name: string;
  permission_ids?: number[];
}

export interface AuditLogEntry {
  id: number;
  user: number | null;
  username: string;
  action: string;
  resource: string | null;
  resource_id: string | null;
  ip_address: string | null;
  details: Record<string, any>;
  timestamp: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface CreateUserData {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  company?: string;
  data_scope?: string;
  phone?: string;
  pin_code?: string;
  roles?: number[];
  is_active?: boolean;
}

export interface UpdateUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  company?: string;
  data_scope?: string;
  phone?: string;
  pin_code?: string;
  roles?: number[];
  is_active?: boolean;
}
