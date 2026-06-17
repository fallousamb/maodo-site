export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      company_settings: {
        Row: {
          address: string | null
          bic: string | null
          city: string | null
          company_name: string
          country: string | null
          email: string | null
          iban: string | null
          id: string
          legal_form: string | null
          legal_mention: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          updated_at: string
          vat_applicable: boolean
          vat_number: string | null
          vat_rate: number
        }
        Insert: {
          address?: string | null
          bic?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          legal_form?: string | null
          legal_mention?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
          vat_applicable?: boolean
          vat_number?: string | null
          vat_rate?: number
        }
        Update: {
          address?: string | null
          bic?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          legal_form?: string | null
          legal_mention?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
          vat_applicable?: boolean
          vat_number?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
      course_tracking: {
        Row: {
          actor: string
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string
          reservation_id: string
          speed: number | null
        }
        Insert: {
          actor?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          reservation_id: string
          speed?: number | null
        }
        Update: {
          actor?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          reservation_id?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_tracking_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_availabilities: {
        Row: {
          created_at: string
          driver_id: string
          end_at: string
          id: string
          reservation_id: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          end_at: string
          id?: string
          reservation_id?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          end_at?: string
          id?: string
          reservation_id?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_availabilities_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availabilities_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          document_type: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          file_path: string
          id: string
          mime_type: string
          rejection_reason: string | null
          uploaded_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          file_path: string
          id?: string
          mime_type: string
          rejection_reason?: string | null
          uploaded_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: Database["public"]["Enums"]["driver_document_type"]
          driver_id?: string
          file_path?: string
          id?: string
          mime_type?: string
          rejection_reason?: string | null
          uploaded_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          license_number: string | null
          notes: string | null
          phone: string
          status: string
          updated_at: string
          user_id: string | null
          vehicle_brand: string | null
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          vehicle_year: number | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          license_number?: string | null
          notes?: string | null
          phone: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          license_number?: string | null
          notes?: string | null
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_percent: number
          id: string
          used: boolean
          used_at: string | null
          used_by_reservation_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_percent: number
          id?: string
          used?: boolean
          used_at?: string | null
          used_by_reservation_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          id?: string
          used?: boolean
          used_at?: string | null
          used_by_reservation_id?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          distance_km: number | null
          dropoff_address: string
          duration_min: number | null
          estimated_price: number | null
          id: string
          invoice_issued_at: string | null
          invoice_number: string | null
          message: string | null
          payment_method: string
          payment_status: string
          pickup_address: string
          pickup_datetime: string
          promo_code: string | null
          started_at: string | null
          status: string
          stripe_session_id: string | null
          tracking_token: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          distance_km?: number | null
          dropoff_address: string
          duration_min?: number | null
          estimated_price?: number | null
          id?: string
          invoice_issued_at?: string | null
          invoice_number?: string | null
          message?: string | null
          payment_method?: string
          payment_status?: string
          pickup_address: string
          pickup_datetime: string
          promo_code?: string | null
          started_at?: string | null
          status?: string
          stripe_session_id?: string | null
          tracking_token?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          distance_km?: number | null
          dropoff_address?: string
          duration_min?: number | null
          estimated_price?: number | null
          id?: string
          invoice_issued_at?: string | null
          invoice_number?: string | null
          message?: string | null
          payment_method?: string
          payment_status?: string
          pickup_address?: string
          pickup_datetime?: string
          promo_code?: string | null
          started_at?: string | null
          status?: string
          stripe_session_id?: string | null
          tracking_token?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          rating: number
          status: string
          text: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          rating: number
          status?: string
          text: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          rating?: number
          status?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver" | "user"
      driver_document_type:
        | "id_card"
        | "passport"
        | "driving_license"
        | "vtc_card"
        | "vehicle_insurance"
        | "civil_liability"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "driver", "user"],
      driver_document_type: [
        "id_card",
        "passport",
        "driving_license",
        "vtc_card",
        "vehicle_insurance",
        "civil_liability",
      ],
    },
  },
} as const
