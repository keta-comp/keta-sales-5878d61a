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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_settings: {
        Row: {
          created_at: string
          custom_instructions: string
          enabled: boolean
          escalation_rules: string
          id: string
          language_instruction: string
          max_discount_percent: number
          model: string
          sales_strategy: string
          tone_of_voice: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_instructions?: string
          enabled?: boolean
          escalation_rules?: string
          id?: string
          language_instruction?: string
          max_discount_percent?: number
          model?: string
          sales_strategy?: string
          tone_of_voice?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_instructions?: string
          enabled?: boolean
          escalation_rules?: string
          id?: string
          language_instruction?: string
          max_discount_percent?: number
          model?: string
          sales_strategy?: string
          tone_of_voice?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          business_description: string
          business_name: string
          created_at: string
          currency: string
          delivery_info: string
          id: string
          operator_group_chat_id: string | null
          payment_methods: string
          return_policy: string
          updated_at: string
          working_hours: string
        }
        Insert: {
          business_description?: string
          business_name?: string
          created_at?: string
          currency?: string
          delivery_info?: string
          id?: string
          operator_group_chat_id?: string | null
          payment_methods?: string
          return_policy?: string
          updated_at?: string
          working_hours?: string
        }
        Update: {
          business_description?: string
          business_name?: string
          created_at?: string
          currency?: string
          delivery_info?: string
          id?: string
          operator_group_chat_id?: string | null
          payment_methods?: string
          return_policy?: string
          updated_at?: string
          working_hours?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_operator_id: string | null
          channel: string
          created_at: string
          customer_id: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          mode: Database["public"]["Enums"]["conversation_mode"]
          telegram_chat_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_operator_id?: string | null
          channel?: string
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          mode?: Database["public"]["Enums"]["conversation_mode"]
          telegram_chat_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_operator_id?: string | null
          channel?: string
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          mode?: Database["public"]["Enums"]["conversation_mode"]
          telegram_chat_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          last_interaction_at: string
          location: string | null
          notes: string | null
          phone: string | null
          telegram_user_id: string | null
          telegram_username: string | null
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          last_interaction_at?: string
          location?: string | null
          notes?: string | null
          phone?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          last_interaction_at?: string
          location?: string | null
          notes?: string | null
          phone?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          change: number
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          reason: string
          reference_id: string | null
        }
        Insert: {
          change: number
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          reason: string
          reference_id?: string | null
        }
        Update: {
          change?: number
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          reason?: string
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          actor: string
          created_at: string
          detail: string | null
          event_type: string
          id: string
          lead_id: string
        }
        Insert: {
          actor?: string
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          lead_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_summary: string | null
          assigned_operator_id: string | null
          budget: string | null
          conversation_id: string | null
          created_at: string
          customer_id: string
          handoff_reason: string | null
          id: string
          location: string | null
          notes: string | null
          phone: string | null
          product_id: string | null
          requested_product: string | null
          score: Database["public"]["Enums"]["lead_score"]
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          assigned_operator_id?: string | null
          budget?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          handoff_reason?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          requested_product?: string | null
          score?: Database["public"]["Enums"]["lead_score"]
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          assigned_operator_id?: string | null
          budget?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          handoff_reason?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          requested_product?: string | null
          score?: Database["public"]["Enums"]["lead_score"]
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          operator_id: string | null
          role: Database["public"]["Enums"]["message_role"]
          telegram_message_id: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          operator_id?: string | null
          role: Database["public"]["Enums"]["message_role"]
          telegram_message_id?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          operator_id?: string | null
          role?: Database["public"]["Enums"]["message_role"]
          telegram_message_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          lead_id: string
          operator_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lead_id: string
          operator_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lead_id?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_assignments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          telegram_user_id: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_operator_id: string | null
          conversation_id: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          id: string
          lead_id: string | null
          notes: string | null
          order_number: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          status: Database["public"]["Enums"]["order_status"]
          stock_applied: boolean
          total: number
          updated_at: string
        }
        Insert: {
          assigned_operator_id?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          order_number?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_applied?: boolean
          total?: number
          updated_at?: string
        }
        Update: {
          assigned_operator_id?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          order_number?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_applied?: boolean
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string
          id: string
          images: Json
          is_active: boolean
          is_archived: boolean
          low_stock_threshold: number
          name: string
          price: number
          reserved_quantity: number
          sku: string
          specifications: Json
          stock_quantity: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string
          id?: string
          images?: Json
          is_active?: boolean
          is_archived?: boolean
          low_stock_threshold?: number
          name: string
          price?: number
          reserved_quantity?: number
          sku: string
          specifications?: Json
          stock_quantity?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string
          id?: string
          images?: Json
          is_active?: boolean
          is_archived?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          reserved_quantity?: number
          sku?: string
          specifications?: Json
          stock_quantity?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_updates: {
        Row: {
          created_at: string
          payload: Json
          update_id: number
        }
        Insert: {
          created_at?: string
          payload: Json
          update_id: number
        }
        Update: {
          created_at?: string
          payload?: Json
          update_id?: number
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
      apply_order_stock: {
        Args: { _actor?: string; _order_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      revert_order_stock: {
        Args: { _actor?: string; _order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "operator"
      conversation_mode: "ai" | "human"
      lead_score: "hot" | "warm" | "cold"
      lead_status:
        | "new"
        | "needs_operator"
        | "assigned"
        | "contacted"
        | "negotiating"
        | "won"
        | "lost"
      message_role: "customer" | "ai" | "operator" | "system"
      order_status:
        | "new"
        | "confirming"
        | "confirmed"
        | "preparing"
        | "delivered"
        | "cancelled"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
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
      app_role: ["admin", "operator"],
      conversation_mode: ["ai", "human"],
      lead_score: ["hot", "warm", "cold"],
      lead_status: [
        "new",
        "needs_operator",
        "assigned",
        "contacted",
        "negotiating",
        "won",
        "lost",
      ],
      message_role: ["customer", "ai", "operator", "system"],
      order_status: [
        "new",
        "confirming",
        "confirmed",
        "preparing",
        "delivered",
        "cancelled",
      ],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
    },
  },
} as const
