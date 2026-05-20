export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VehicleStatus = "active" | "maintenance" | "inactive";
export type VehicleType = "taxi" | "moto";
export type UserRole = "driver" | "investor" | "admin";
export type EntryCurrency = "CDF" | "USD";
export type BreakdownStatus = "open" | "in_progress" | "resolved";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          role?: UserRole;
          phone?: string | null;
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
    };
    CompositeTypes: Record<string, never>;
  };
};
