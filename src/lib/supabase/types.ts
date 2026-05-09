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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
