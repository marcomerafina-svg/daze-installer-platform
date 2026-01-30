export type UserRole = 'admin' | 'installer' | 'company_owner' | 'company_admin';

export type LeadStatus = 'Nuova' | 'In lavorazione' | 'Chiusa Vinta' | 'Chiusa Persa';

export type InstallationSourceType = 'daze_lead' | 'self_reported';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type CompanyRole = 'owner' | 'admin' | 'installer';

export interface AuthUser {
  id: string;
  email?: string;
  role?: UserRole;
}

export interface InstallationCompany {
  id: string;
  company_name: string;
  vat_number?: string;
  business_name?: string;
  address?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Installer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  region?: string;
  company_id?: string;
  role_in_company?: CompanyRole;
  can_manage_company: boolean;
  employee_number?: string;
  hired_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: InstallationCompany;
}

export interface InstallerWithStats extends Installer {
  total_leads: number;
  active_leads: number;
  won_leads: number;
  conversion_rate: number;
}

export interface AreaManager {
  id: string;
  user_id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  territory: string;
  regions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  type: string;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface WallboxSerial {
  id: string;
  lead_id: string | null;
  serial_code: string;
  product_id?: string;
  year?: number;
  production_number?: number;
  installer_id?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  installation_date?: string;
  installation_notes?: string;
  source_type: InstallationSourceType;
  approval_status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  photo_urls?: string[];
  created_at: string;
  product?: Product;
}

export interface SerialParseResult {
  isValid: boolean;
  product?: Product;
  year?: number;
  production_number?: number;
  error?: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  address?: string;
  description?: string;
  status: LeadStatus;
  zoho_lead_id?: string;
  quote_pdf_url?: string;
  wallbox_serial?: string;
  created_at: string;
  updated_at: string;
  serials?: WallboxSerial[];
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  installer_id?: string;
  assigned_to_company_id?: string;
  assigned_at: string;
  is_viewed: boolean;
  viewed_at?: string;
  confirmed_by_installer: boolean;
  confirmed_at?: string;
  internally_assigned_at?: string;
  internally_assigned_by?: string;
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  installer_id?: string;
  old_status?: string;
  new_status: string;
  changed_at: string;
  notes?: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  installer_id: string;
  note_text: string;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  assignment_id?: string;
  installer_id: string;
  lead_id: string;
  email_sent_to: string;
  status: 'pending' | 'sent' | 'failed';
  resend_message_id?: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export interface RewardsTier {
  id: string;
  tier_name: string;
  tier_level: number;
  display_name: string;
  points_required: number;
  badge_color: string;
  description: string;
  created_at: string;
}

export interface InstallerRewards {
  id: string;
  installer_id: string;
  total_points: number;
  current_tier_id?: string;
  tier_reached_at?: string;
  created_at: string;
  updated_at: string;
  tier?: RewardsTier;
}

export interface CompanyRewards {
  id: string;
  company_id: string;
  total_points: number;
  current_tier_id?: string;
  tier_reached_at?: string;
  created_at: string;
  updated_at: string;
  tier?: RewardsTier;
  company?: InstallationCompany;
}

export interface PointsTransaction {
  id: string;
  installer_id: string;
  company_id?: string;
  lead_id?: string;
  points_earned: number;
  transaction_type: 'lead_won' | 'manual_adjustment' | 'tier_bonus' | 'correction';
  description: string;
  created_at: string;
}

export interface LeaderboardEntry extends Installer {
  total_points: number;
  current_tier?: RewardsTier;
  won_leads: number;
  total_leads: number;
  conversion_rate: number;
  rank: number;
}

export interface Installation {
  id: string;
  installer_id: string;
  source_type: InstallationSourceType;
  approval_status: ApprovalStatus;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  installation_date: string;
  installation_notes?: string;
  serials: WallboxSerial[];
  total_points: number;
  pending_points: number;
  photo_urls?: string[];
  created_at: string;
  lead?: Lead;
}

export interface InstallationStats {
  total: number;
  from_leads: number;
  self_reported: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  total_points: number;
  pending_points: number;
}

export interface InstallerContribution {
  installer_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  total_points_contributed: number;
  installations_count: number;
  approved_installations_count: number;
}

export interface CompanyStats {
  total_installers: number;
  active_installers: number;
  total_points: number;
  total_leads: number;
  total_installations: number;
  conversion_rate: number;
  current_tier?: RewardsTier;
}

export interface LeadInternalAssignment {
  id: string;
  lead_id: string;
  assignment_id: string;
  company_id: string;
  from_installer_id?: string;
  to_installer_id: string;
  assigned_by: string;
  notes?: string;
  created_at: string;
}

export interface CompanyWithStats extends InstallationCompany {
  stats: CompanyStats;
  owner?: Installer;
}

export interface Database {
  public: {
    Tables: {
      installers: {
        Row: Installer;
        Insert: Omit<Installer, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Installer, 'id' | 'created_at' | 'updated_at'>>;
      };
      area_managers: {
        Row: AreaManager;
        Insert: Omit<AreaManager, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AreaManager, 'id' | 'created_at' | 'updated_at'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at'>>;
      };
      wallbox_serials: {
        Row: WallboxSerial;
        Insert: Omit<WallboxSerial, 'id' | 'created_at'>;
        Update: Partial<Omit<WallboxSerial, 'id' | 'created_at'>>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>;
      };
      lead_assignments: {
        Row: LeadAssignment;
        Insert: Omit<LeadAssignment, 'id' | 'assigned_at' | 'is_viewed' | 'confirmed_by_installer'>;
        Update: Partial<Omit<LeadAssignment, 'id' | 'assigned_at'>>;
      };
      lead_status_history: {
        Row: LeadStatusHistory;
        Insert: Omit<LeadStatusHistory, 'id' | 'changed_at'>;
        Update: Partial<Omit<LeadStatusHistory, 'id' | 'changed_at'>>;
      };
      lead_notes: {
        Row: LeadNote;
        Insert: Omit<LeadNote, 'id' | 'created_at'>;
        Update: Partial<Omit<LeadNote, 'id' | 'created_at'>>;
      };
      notification_logs: {
        Row: NotificationLog;
        Insert: Omit<NotificationLog, 'id' | 'created_at'>;
        Update: Partial<Omit<NotificationLog, 'id' | 'created_at'>>;
      };
      rewards_tiers: {
        Row: RewardsTier;
        Insert: Omit<RewardsTier, 'id' | 'created_at'>;
        Update: Partial<Omit<RewardsTier, 'id' | 'created_at'>>;
      };
      installer_rewards: {
        Row: InstallerRewards;
        Insert: Omit<InstallerRewards, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<InstallerRewards, 'id' | 'created_at' | 'updated_at'>>;
      };
      points_transactions: {
        Row: PointsTransaction;
        Insert: Omit<PointsTransaction, 'id' | 'created_at'>;
        Update: Partial<Omit<PointsTransaction, 'id' | 'created_at'>>;
      };
    };
  };
}
