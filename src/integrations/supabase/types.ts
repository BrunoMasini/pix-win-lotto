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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          buyer_cpf: string
          buyer_email: string
          buyer_name: string
          buyer_whatsapp: string
          created_at: string
          expires_at: string
          id: string
          mp_payment_id: string | null
          numbers: number[]
          paid_at: string | null
          pix_copia_cola: string | null
          pix_qr_code_base64: string | null
          raffle_id: string | null
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          amount: number
          buyer_cpf: string
          buyer_email: string
          buyer_name: string
          buyer_whatsapp: string
          created_at?: string
          expires_at: string
          id?: string
          mp_payment_id?: string | null
          numbers: number[]
          paid_at?: string | null
          pix_copia_cola?: string | null
          pix_qr_code_base64?: string | null
          raffle_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          amount?: number
          buyer_cpf?: string
          buyer_email?: string
          buyer_name?: string
          buyer_whatsapp?: string
          created_at?: string
          expires_at?: string
          id?: string
          mp_payment_id?: string | null
          numbers?: number[]
          paid_at?: string | null
          pix_copia_cola?: string | null
          pix_qr_code_base64?: string | null
          raffle_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_numbers: {
        Row: {
          number: number
          order_id: string | null
          raffle_id: string
          status: Database["public"]["Enums"]["raffle_number_status"]
          updated_at: string
        }
        Insert: {
          number: number
          order_id?: string | null
          raffle_id: string
          status?: Database["public"]["Enums"]["raffle_number_status"]
          updated_at?: string
        }
        Update: {
          number?: number
          order_id?: string | null
          raffle_id?: string
          status?: Database["public"]["Enums"]["raffle_number_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_numbers_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          created_at: string
          description: string
          finished_at: string | null
          id: string
          image_url: string | null
          price_per_number: number
          status: string
          title: string
          total_numbers: number
          updated_at: string
          winner_name: string | null
          winner_number: number | null
          winner_order_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          finished_at?: string | null
          id?: string
          image_url?: string | null
          price_per_number?: number
          status?: string
          title: string
          total_numbers?: number
          updated_at?: string
          winner_name?: string | null
          winner_number?: number | null
          winner_order_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          finished_at?: string | null
          id?: string
          image_url?: string | null
          price_per_number?: number
          status?: string
          title?: string
          total_numbers?: number
          updated_at?: string
          winner_name?: string | null
          winner_number?: number | null
          winner_order_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_numbers: { Args: { _order_id: string }; Returns: undefined }
      confirm_numbers_force: { Args: { _order_id: string }; Returns: Json }
      expire_stale_orders: { Args: never; Returns: undefined }
      finalize_raffle: {
        Args: {
          _new_description: string
          _new_image_url: string
          _new_price: number
          _new_title: string
          _new_total_numbers: number
          _raffle_id: string
          _winner_number: number
        }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      release_numbers: { Args: { _order_id: string }; Returns: undefined }
      reserve_numbers: {
        Args: {
          _expires_at: string
          _numbers: number[]
          _order_id: string
          _raffle_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      order_status: "pending" | "paid" | "expired" | "cancelled"
      raffle_number_status: "available" | "pending" | "paid"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      order_status: ["pending", "paid", "expired", "cancelled"],
      raffle_number_status: ["available", "pending", "paid"],
    },
  },
} as const
