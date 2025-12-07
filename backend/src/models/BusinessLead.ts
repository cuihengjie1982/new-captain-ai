export interface BusinessLead {
  id: string;
  name: string;
  position: string;
  company: string;
  phone: string;
  email: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  notes?: string;
  assigned_to?: string;
  followed_up_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBusinessLeadData {
  name: string;
  position: string;
  company: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface UpdateBusinessLeadData {
  name?: string;
  position?: string;
  company?: string;
  phone?: string;
  email?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'closed';
  notes?: string;
  assigned_to?: string;
  followed_up_at?: Date;
}

export interface BusinessLeadQuery {
  page?: number;
  limit?: number;
  status?: 'new' | 'contacted' | 'qualified' | 'closed';
  assigned_to?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface BusinessLeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  closed: number;
  conversion_rate: number;
  average_response_time: number;
}