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
      activities: {
        Row: {
          action: string
          actor: string
          actor_user_id: string | null
          business_id: string
          created_at: string
          customer_id: string | null
          detail: string | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor?: string
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string | null
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string | null
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          business_id: string
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
          business_id?: string
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
          business_id?: string
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
        Relationships: [
          {
            foreignKeyName: "ai_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          business_id: string | null
          created_at: string
          feature: string
          id: string
          input_tokens: number
          model: string | null
          output_tokens: number
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          feature: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          feature?: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          duration_minutes: number | null
          employee_id: string | null
          ends_at: string
          id: string
          note: string
          price: number | null
          service_id: string | null
          service_name: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          duration_minutes?: number | null
          employee_id?: string | null
          ends_at: string
          id?: string
          note?: string
          price?: number | null
          service_id?: string | null
          service_name?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          duration_minutes?: number | null
          employee_id?: string | null
          ends_at?: string
          id?: string
          note?: string
          price?: number | null
          service_id?: string | null
          service_name?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_kind: string
          actor_user_id: string | null
          business_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          status: string
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_kind?: string
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_kind?: string
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          business_id: string
          cancel_reason: number | null
          cancel_time: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_no: number
          perform_time: string | null
          plan: string
          provider: string
          provider_state: number | null
          provider_time: number | null
          provider_txn_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          cancel_reason?: number | null
          cancel_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no?: number
          perform_time?: string | null
          plan: string
          provider: string
          provider_state?: number | null
          provider_time?: number | null
          provider_txn_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          cancel_reason?: number | null
          cancel_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no?: number
          perform_time?: string | null
          plan?: string
          provider?: string
          provider_state?: number | null
          provider_time?: number | null
          provider_txn_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          business_description: string
          business_id: string
          business_name: string
          created_at: string
          currency: string
          delivery_info: string
          id: string
          logo_path: string
          staff_group_chat_id: string | null
          payment_methods: string
          phone: string
          return_policy: string
          updated_at: string
          working_hours: string
        }
        Insert: {
          business_description?: string
          business_id?: string
          business_name?: string
          created_at?: string
          currency?: string
          delivery_info?: string
          id?: string
          logo_path?: string
          staff_group_chat_id?: string | null
          payment_methods?: string
          phone?: string
          return_policy?: string
          updated_at?: string
          working_hours?: string
        }
        Update: {
          business_description?: string
          business_id?: string
          business_name?: string
          created_at?: string
          currency?: string
          delivery_info?: string
          id?: string
          logo_path?: string
          staff_group_chat_id?: string | null
          payment_methods?: string
          phone?: string
          return_policy?: string
          updated_at?: string
          working_hours?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          booking_enabled: boolean
          booking_slug: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string
          status: string
          subscription_ends_at: string | null
          suspend_reason: string | null
          suspended_at: string | null
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          booking_enabled?: boolean
          booking_slug?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          plan?: string
          status?: string
          subscription_ends_at?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          booking_enabled?: boolean
          booking_slug?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          status?: string
          subscription_ends_at?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          phone: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          phone: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          branch_id: string | null
          business_id: string
          cash_expense: number | null
          cash_income: number | null
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_cash: number | null
          id: string
          note: string
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: string
        }
        Insert: {
          branch_id?: string | null
          business_id?: string
          cash_expense?: number | null
          cash_income?: number | null
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          note?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          cash_expense?: number | null
          cash_income?: number | null
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          note?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_member_id: string | null
          business_id: string
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
          assigned_member_id?: string | null
          business_id?: string
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
          assigned_member_id?: string | null
          business_id?: string
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
            foreignKeyName: "conversations_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
      crm_configs: {
        Row: {
          business_description: string | null
          business_id: string
          config: Json
          created_at: string
          id: string
          industry: string
          updated_at: string
        }
        Insert: {
          business_description?: string | null
          business_id: string
          config?: Json
          created_at?: string
          id?: string
          industry: string
          updated_at?: string
        }
        Update: {
          business_description?: string | null
          business_id?: string
          config?: Json
          created_at?: string
          id?: string
          industry?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_records: {
        Row: {
          business_id: string
          created_at: string
          data: Json
          id: string
          module_key: string
          stage: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          data?: Json
          id?: string
          module_key: string
          stage?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          data?: Json
          id?: string
          module_key?: string
          stage?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_member_id: string | null
          business_id: string
          consent_updated_at: string | null
          created_at: string
          email: string | null
          erased_at: string | null
          erased_by: string | null
          full_name: string | null
          id: string
          instagram_user_id: string | null
          last_contact_at: string | null
          last_interaction_at: string
          location: string | null
          marketing_consent: boolean
          notes: string | null
          phone: string | null
          source: string
          status: string
          telegram_user_id: string | null
          telegram_username: string | null
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          assigned_member_id?: string | null
          business_id?: string
          consent_updated_at?: string | null
          created_at?: string
          email?: string | null
          erased_at?: string | null
          erased_by?: string | null
          full_name?: string | null
          id?: string
          instagram_user_id?: string | null
          last_contact_at?: string | null
          last_interaction_at?: string
          location?: string | null
          marketing_consent?: boolean
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          telegram_user_id?: string | null
          telegram_username?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          assigned_member_id?: string | null
          business_id?: string
          consent_updated_at?: string | null
          created_at?: string
          email?: string | null
          erased_at?: string | null
          erased_by?: string | null
          full_name?: string | null
          id?: string
          instagram_user_id?: string | null
          last_contact_at?: string | null
          last_interaction_at?: string
          location?: string | null
          marketing_consent?: boolean
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          telegram_user_id?: string | null
          telegram_username?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_services: {
        Row: {
          business_id: string
          commission_percent: number | null
          created_at: string
          employee_id: string
          service_id: string
        }
        Insert: {
          business_id: string
          commission_percent?: number | null
          created_at?: string
          employee_id: string
          service_id: string
        }
        Update: {
          business_id?: string
          commission_percent?: number | null
          created_at?: string
          employee_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          hired_on: string | null
          id: string
          is_active: boolean
          phone: string
          position: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          full_name: string
          hired_on?: string | null
          id?: string
          is_active?: boolean
          phone?: string
          position?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          hired_on?: string | null
          id?: string
          is_active?: boolean
          phone?: string
          position?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_events: {
        Row: {
          bucket: string
          business_id: string | null
          created_at: string
          detail: string
          fingerprint: string
          id: string
          level: string
          message: string
          route: string
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          bucket: string
          business_id?: string | null
          created_at?: string
          detail?: string
          fingerprint: string
          id?: string
          level?: string
          message?: string
          route?: string
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          bucket?: string
          business_id?: string | null
          created_at?: string
          detail?: string
          fingerprint?: string
          id?: string
          level?: string
          message?: string
          route?: string
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          business_id: string
          category: string
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          note: string
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          business_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          note?: string
          payment_method?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          business_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          note?: string
          payment_method?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          key: string
          label: string
          target_business_id: string | null
          target_plan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          key: string
          label: string
          target_business_id?: string | null
          target_plan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          key?: string
          label?: string
          target_business_id?: string | null
          target_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_target_business_id_fkey"
            columns: ["target_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_events: {
        Row: {
          created_at: string
          mid: string
          payload: Json
        }
        Insert: {
          created_at?: string
          mid: string
          payload?: Json
        }
        Update: {
          created_at?: string
          mid?: string
          payload?: Json
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          business_id: string
          change: number
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          reason: string
          reference_id: string | null
        }
        Insert: {
          business_id?: string
          change: number
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          reason: string
          reference_id?: string | null
        }
        Update: {
          business_id?: string
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
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
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
          business_id: string
          created_at: string
          detail: string | null
          event_type: string
          id: string
          lead_id: string
        }
        Insert: {
          actor?: string
          business_id?: string
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          lead_id: string
        }
        Update: {
          actor?: string
          business_id?: string
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
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
          assigned_member_id: string | null
          budget: string | null
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string
          handoff_reason: string | null
          id: string
          last_contact_at: string | null
          location: string | null
          next_action: string | null
          notes: string | null
          phone: string | null
          product_id: string | null
          requested_product: string | null
          score: Database["public"]["Enums"]["lead_score"]
          source: string
          stage: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          value: number
        }
        Insert: {
          ai_summary?: string | null
          assigned_member_id?: string | null
          budget?: string | null
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          handoff_reason?: string | null
          id?: string
          last_contact_at?: string | null
          location?: string | null
          next_action?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          requested_product?: string | null
          score?: Database["public"]["Enums"]["lead_score"]
          source?: string
          stage?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          value?: number
        }
        Update: {
          ai_summary?: string | null
          assigned_member_id?: string | null
          budget?: string | null
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          handoff_reason?: string | null
          id?: string
          last_contact_at?: string | null
          location?: string | null
          next_action?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          requested_product?: string | null
          score?: Database["public"]["Enums"]["lead_score"]
          source?: string
          stage?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
          business_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          member_id: string | null
          role: Database["public"]["Enums"]["message_role"]
          telegram_message_id: number | null
        }
        Insert: {
          business_id?: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          member_id?: string | null
          role: Database["public"]["Enums"]["message_role"]
          telegram_message_id?: number | null
        }
        Update: {
          business_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          member_id?: string | null
          role?: Database["public"]["Enums"]["message_role"]
          telegram_message_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          business_id: string
          id: string
          lead_id: string
          member_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          business_id?: string
          id?: string
          lead_id: string
          member_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          business_id?: string
          id?: string
          lead_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "system_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          business_id: string
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
          business_id?: string
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
          business_id?: string
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
            foreignKeyName: "order_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
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
          assigned_member_id: string | null
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          discount: number
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
          assigned_member_id?: string | null
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          discount?: number
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
          assigned_member_id?: string | null
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          discount?: number
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
            foreignKeyName: "orders_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          method: string
          note: string | null
          order_id: string | null
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_rules: {
        Row: {
          base_salary: number
          business_id: string
          commission_percent: number
          created_at: string
          employee_id: string
          id: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          business_id: string
          commission_percent?: number
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          business_id?: string
          commission_percent?: number
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_rules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_statements: {
        Row: {
          advance_amount: number
          approved_at: string | null
          approved_by: string | null
          base_amount: number
          bonus_amount: number
          business_id: string
          commission_amount: number
          created_at: string
          deduction_amount: number
          employee_id: string
          expense_id: string | null
          id: string
          note: string
          paid_at: string | null
          paid_method: string
          period_end: string
          period_start: string
          service_revenue: number
          status: string
          total_computed: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          advance_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          bonus_amount?: number
          business_id: string
          commission_amount?: number
          created_at?: string
          deduction_amount?: number
          employee_id: string
          expense_id?: string | null
          id?: string
          note?: string
          paid_at?: string | null
          paid_method?: string
          period_end: string
          period_start: string
          service_revenue?: number
          status?: string
          total_computed?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          advance_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          bonus_amount?: number
          business_id?: string
          commission_amount?: number
          created_at?: string
          deduction_amount?: number
          employee_id?: string
          expense_id?: string | null
          id?: string
          note?: string
          paid_at?: string | null
          paid_method?: string
          period_end?: string
          period_start?: string
          service_revenue?: number
          status?: string
          total_computed?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_statements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_statements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_statements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_statements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          business_id: string
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
          business_id?: string
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
          business_id?: string
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
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
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
          last_active_at: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_active_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          target_kind: string
          target_value: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          target_kind?: string
          target_value?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          target_kind?: string
          target_value?: string | null
          title?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          default_currency: string
          default_timezone: string
          id: string
          maintenance_message: string | null
          maintenance_mode: boolean
          platform_name: string
          support_email: string
          support_phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          default_timezone?: string
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          platform_name?: string
          support_email?: string
          support_phone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          default_timezone?: string
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          platform_name?: string
          support_email?: string
          support_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_member_id: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          order_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_member_id?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          order_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_member_id?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          order_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          ends_at: string
          id: string
          reason: string
          starts_at: string
        }
        Insert: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          ends_at: string
          id?: string
          reason?: string
          starts_at: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          ends_at?: string
          id?: string
          reason?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_requests: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          telegram_chat_id: string
          telegram_user_id: string
          telegram_username: string | null
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          telegram_chat_id: string
          telegram_user_id: string
          telegram_username?: string | null
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          telegram_chat_id?: string
          telegram_user_id?: string
          telegram_username?: string | null
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          business_id: string
          created_at: string
          daily_reports: boolean
          id: string
          last_report_date: string | null
          linked_at: string
          notify_booking: boolean
          notify_lead: boolean
          notify_low_stock: boolean
          notify_new_order: boolean
          notify_payment: boolean
          report_time: string
          status: string
          telegram_chat_id: string
          telegram_user_id: string
          telegram_username: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          daily_reports?: boolean
          id?: string
          last_report_date?: string | null
          linked_at?: string
          notify_booking?: boolean
          notify_lead?: boolean
          notify_low_stock?: boolean
          notify_new_order?: boolean
          notify_payment?: boolean
          report_time?: string
          status?: string
          telegram_chat_id: string
          telegram_user_id: string
          telegram_username?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          daily_reports?: boolean
          id?: string
          last_report_date?: string | null
          linked_at?: string
          notify_booking?: boolean
          notify_lead?: boolean
          notify_low_stock?: boolean
          notify_new_order?: boolean
          notify_payment?: boolean
          report_time?: string
          status?: string
          telegram_chat_id?: string
          telegram_user_id?: string
          telegram_username?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_updates: {
        Row: {
          business_id: string
          created_at: string
          payload: Json
          update_id: number
        }
        Insert: {
          business_id: string
          created_at?: string
          payload: Json
          update_id: number
        }
        Update: {
          business_id?: string
          created_at?: string
          payload?: Json
          update_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_updates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      work_schedules: {
        Row: {
          break_end: string | null
          break_start: string | null
          business_id: string
          created_at: string
          employee_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          business_id?: string
          created_at?: string
          employee_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          business_id?: string
          created_at?: string
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      business_role: {
        Args: { _business_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      branch_access_ok: {
        Args: { _branch_id: string | null; _business_id: string }
        Returns: boolean
      }
      current_business_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_admin: { Args: { _business_id: string }; Returns: boolean }
      is_business_member: { Args: { _business_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      my_access_state: { Args: never; Returns: Json }
      my_workspace_status: { Args: never; Returns: string }
      platform_stats: { Args: never; Returns: Json }
      revert_order_stock: {
        Args: { _actor?: string; _order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      // 'operator' is an inert leftover of the old sales-agent desk: Postgres cannot drop
      // enum labels, so it stays in the type while no row and no code path uses it.
      app_role: "admin" | "operator" | "owner" | "manager" | "cashier" | "receptionist"
      conversation_mode: "ai" | "human"
      lead_score: "hot" | "warm" | "cold"
      lead_status:
        | "new"
        | "needs_attention"
        | "assigned"
        | "contacted"
        | "negotiating"
        | "won"
        | "lost"
      message_role: "customer" | "ai" | "staff" | "system"
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
      app_role: ["admin", "operator", "owner", "manager", "cashier", "receptionist"],
      conversation_mode: ["ai", "human"],
      lead_score: ["hot", "warm", "cold"],
      lead_status: [
        "new",
        "needs_attention",
        "assigned",
        "contacted",
        "negotiating",
        "won",
        "lost",
      ],
      message_role: ["customer", "ai", "staff", "system"],
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
