export interface BusinessConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  type: 'string' | 'json' | 'number' | 'boolean';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BusinessContactInfo {
  contactPerson: string;
  contactMethod: string;
  email: string;
}

export interface CreateBusinessConfigData {
  config_key: string;
  config_value: string;
  description?: string;
  type?: 'string' | 'json' | 'number' | 'boolean';
  is_active?: boolean;
}

export interface UpdateBusinessConfigData {
  config_value?: string;
  description?: string;
  type?: 'string' | 'json' | 'number' | 'boolean';
  is_active?: boolean;
}

export interface BusinessConfigQuery {
  key?: string;
  type?: 'string' | 'json' | 'number' | 'boolean';
  is_active?: boolean;
}