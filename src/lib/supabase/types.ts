export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VehicleStatus = "en service" | "maintenance" | "repos";
export type VehicleType = "taxi" | "moto";
export type UserRole = "driver" | "investor" | "admin";
export type EntryCurrency = "CDF" | "USD";
export type BreakdownStatus = "open" | "in_progress" | "resolved";
export type PaymentStatus = "pending" | "approved" | "validated" | "rejected";
export type PaymentSource = "automated" | "manual_backup";
export type RevenueSessionType = "driver_revenue" | "investor_revenue";
export type DocumentType =
  | "contrat_employe"
  | "contrat_location_vente"
  | "assurance"
  | "carte_rose"
  | "permis"
  | "controle_technique"
  | "autorisation_transport";
export type ContractType = "employe" | "location_vente";
export type ContractStatus = "active" | "completed" | "terminated" | "draft";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          /** Numéro de téléphone au format RDC (+243XXXXXXXXX). Peut être null. */
          phone: string | null;
          is_owner_driver: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
          phone?: string | null;
          is_owner_driver?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          role?: UserRole;
          /** Mise à jour du numéro de téléphone (format RDC attendu). */
          phone?: string | null;
          is_owner_driver?: boolean;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          owner_id: string;
          driver_id: string | null;
          plate_number: string;
          label: string;
          type: VehicleType;
          status: VehicleStatus;
          target_daily_revenue: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          driver_id?: string | null;
          plate_number: string;
          label: string;
          type: VehicleType;
          status?: VehicleStatus;
          target_daily_revenue?: number;
          created_at?: string;
        };
        Update: {
          driver_id?: string | null;
          plate_number?: string;
          label?: string;
          type?: VehicleType;
          status?: VehicleStatus;
          target_daily_revenue?: number;
        };
        Relationships: [];
      };
      daily_entries: {
        Row: {
          id: string;
          owner_id: string;
          vehicle_id: string;
          driver_id: string | null;
          entry_date: string;
          amount: number;
          currency: EntryCurrency;
          mileage_km: number;
          revenue_cdf: number;
          fuel_cdf: number;
          maintenance_cdf: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          vehicle_id: string;
          driver_id?: string | null;
          entry_date: string;
          amount: number;
          currency: EntryCurrency;
          mileage_km: number;
          revenue_cdf: number;
          fuel_cdf?: number;
          maintenance_cdf?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          vehicle_id?: string;
          driver_id?: string | null;
          entry_date?: string;
          amount?: number;
          currency?: EntryCurrency;
          mileage_km?: number;
          revenue_cdf?: number;
          fuel_cdf?: number;
          maintenance_cdf?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      breakdowns: {
        Row: {
          id: string;
          vehicle_id: string;
          reported_by: string;
          type: string;
          description: string | null;
          estimated_cost: number;
          status: BreakdownStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          reported_by: string;
          type: string;
          description?: string | null;
          estimated_cost?: number;
          status?: BreakdownStatus;
          created_at?: string;
        };
        Update: {
          vehicle_id?: string;
          reported_by?: string;
          type?: string;
          description?: string | null;
          estimated_cost?: number;
          status?: BreakdownStatus;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          amount: number;
          driver_id: string;
          vehicle_id: string;
          investor_id: string;
          status: PaymentStatus;
          source: PaymentSource;
          session_type: RevenueSessionType;
          payment_date: string;
          comment: string | null;
          rejection_reason: string | null;
          validated_at: string | null;
          rejected_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          driver_id: string;
          vehicle_id: string;
          investor_id: string;
          status?: PaymentStatus;
          source?: PaymentSource;
          session_type?: RevenueSessionType;
          payment_date?: string;
          comment?: string | null;
          rejection_reason?: string | null;
          validated_at?: string | null;
          rejected_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          driver_id?: string;
          vehicle_id?: string;
          investor_id?: string;
          status?: PaymentStatus;
          source?: PaymentSource;
          session_type?: RevenueSessionType;
          payment_date?: string;
          comment?: string | null;
          rejection_reason?: string | null;
          validated_at?: string | null;
          rejected_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [];
      };
      legal_documents: {
        Row: {
          id: string;
          owner_id: string;
          driver_id: string;
          vehicle_id: string | null;
          document_type: DocumentType;
          document_name: string;
          file_url: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          driver_id: string;
          vehicle_id?: string | null;
          document_type: DocumentType;
          document_name: string;
          file_url: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          driver_id?: string;
          vehicle_id?: string | null;
          document_type?: DocumentType;
          document_name?: string;
          file_url?: string;
          storage_path?: string;
        };
        Relationships: [];
      };
      driver_contracts: {
        Row: {
          id: string;
          owner_id: string;
          driver_id: string;
          vehicle_id: string | null;
          contract_type: ContractType;
          status: ContractStatus;
          possession_total_cdf: number | null;
          possession_paid_cdf: number | null;
          started_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          driver_id: string;
          vehicle_id?: string | null;
          contract_type: ContractType;
          status?: ContractStatus;
          possession_total_cdf?: number | null;
          possession_paid_cdf?: number | null;
          started_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          driver_id?: string;
          vehicle_id?: string | null;
          contract_type?: ContractType;
          status?: ContractStatus;
          possession_total_cdf?: number | null;
          possession_paid_cdf?: number | null;
          started_at?: string | null;
          ends_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      report_breakdown_transaction: {
        Args: {
          p_vehicle_id: string;
          p_type: string;
          p_description?: string;
          p_estimated_cost?: number;
        };
        Returns: string;
      };
    };
    Enums: {
      breakdown_status: BreakdownStatus;
      payment_status: PaymentStatus;
      payment_source: PaymentSource;
      revenue_session_type: RevenueSessionType;
      vehicle_status: VehicleStatus;
      user_role: UserRole;
      document_type_enum: DocumentType;
      contract_type: ContractType;
      contract_status: ContractStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
