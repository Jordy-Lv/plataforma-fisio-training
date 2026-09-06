export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alert_settings: {
        Row: {
          created_at: string
          description: string
          key: string
          value: number
        }
        Insert: {
          created_at?: string
          description: string
          key: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          key?: string
          value?: number
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          payload: Json
          read_at: string | null
          recipient_id: string
          severity: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          payload?: Json
          read_at?: string | null
          recipient_id: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          payload?: Json
          read_at?: string | null
          recipient_id?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_rules: {
        Row: {
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number
          template_id: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority: number
          template_id: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attended_on: string
          check_in_at: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          registered_by: string | null
        }
        Insert: {
          attended_on?: string
          check_in_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          registered_by?: string | null
        }
        Update: {
          attended_on?: string
          check_in_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          registered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_assignments: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          kind: Database["public"]["Enums"]["professional_specialty"]
          patient_id: string
          professional_id: string
          started_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["professional_specialty"]
          patient_id: string
          professional_id: string
          started_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["professional_specialty"]
          patient_id?: string
          professional_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_assignments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          contraindications: string[]
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["fitness_level"] | null
          environments: string[]
          equipment: string[]
          external_id: string | null
          id: string
          is_custom: boolean
          media_url: string | null
          muscle_groups: string[]
          name: string
        }
        Insert: {
          contraindications?: string[]
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["fitness_level"] | null
          environments?: string[]
          equipment?: string[]
          external_id?: string | null
          id?: string
          is_custom?: boolean
          media_url?: string | null
          muscle_groups?: string[]
          name: string
        }
        Update: {
          contraindications?: string[]
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["fitness_level"] | null
          environments?: string[]
          equipment?: string[]
          external_id?: string | null
          id?: string
          is_custom?: boolean
          media_url?: string | null
          muscle_groups?: string[]
          name?: string
        }
        Relationships: []
      }
      membership_notices: {
        Row: {
          created_at: string
          expires_on: string
          id: string
          kind: Database["public"]["Enums"]["membership_status"]
          membership_id: string
          notified_at: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string
          expires_on: string
          id?: string
          kind: Database["public"]["Enums"]["membership_status"]
          membership_id: string
          notified_at?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          expires_on?: string
          id?: string
          kind?: Database["public"]["Enums"]["membership_status"]
          membership_id?: string
          notified_at?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_notices_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_notices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          amount: number
          created_at: string
          expires_on: string
          id: string
          notes: string | null
          patient_id: string
          plan_id: string
          started_on: string
          status: Database["public"]["Enums"]["membership_status"]
        }
        Insert: {
          amount?: number
          created_at?: string
          expires_on: string
          id?: string
          notes?: string | null
          patient_id: string
          plan_id: string
          started_on?: string
          status?: Database["public"]["Enums"]["membership_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          expires_on?: string
          id?: string
          notes?: string | null
          patient_id?: string
          plan_id?: string
          started_on?: string
          status?: Database["public"]["Enums"]["membership_status"]
        }
        Relationships: [
          {
            foreignKeyName: "memberships_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_conditions: {
        Row: {
          body_part: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          patient_id: string
          severity: Database["public"]["Enums"]["condition_severity"]
        }
        Insert: {
          body_part: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          patient_id: string
          severity?: Database["public"]["Enums"]["condition_severity"]
        }
        Update: {
          body_part?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          patient_id?: string
          severity?: Database["public"]["Enums"]["condition_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "patient_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_details: {
        Row: {
          birth_date: string | null
          created_at: string
          environment:
            | Database["public"]["Enums"]["training_environment"]
            | null
          equipment: string[]
          goal: Database["public"]["Enums"]["patient_goal"] | null
          level: Database["public"]["Enums"]["fitness_level"] | null
          notes: string | null
          onboarding_step: number
          profile_id: string
          sex: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          environment?:
            | Database["public"]["Enums"]["training_environment"]
            | null
          equipment?: string[]
          goal?: Database["public"]["Enums"]["patient_goal"] | null
          level?: Database["public"]["Enums"]["fitness_level"] | null
          notes?: string | null
          onboarding_step?: number
          profile_id: string
          sex?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          environment?:
            | Database["public"]["Enums"]["training_environment"]
            | null
          equipment?: string[]
          goal?: Database["public"]["Enums"]["patient_goal"] | null
          level?: Database["public"]["Enums"]["fitness_level"] | null
          notes?: string | null
          onboarding_step?: number
          profile_id?: string
          sex?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      person_registrations: {
        Row: {
          created_by: string
          email: string
          expires_at: string
          full_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialty:
            | Database["public"]["Enums"]["professional_specialty"]
            | null
          token: string
        }
        Insert: {
          created_by: string
          email: string
          expires_at?: string
          full_name: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialty?:
            | Database["public"]["Enums"]["professional_specialty"]
            | null
          token?: string
        }
        Update: {
          created_by?: string
          email?: string
          expires_at?: string
          full_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?:
            | Database["public"]["Enums"]["professional_specialty"]
            | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_period: Database["public"]["Enums"]["billing_period"]
          created_at: string
          description: string | null
          features: string[]
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialty:
            | Database["public"]["Enums"]["professional_specialty"]
            | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?:
            | Database["public"]["Enums"]["professional_specialty"]
            | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?:
            | Database["public"]["Enums"]["professional_specialty"]
            | null
        }
        Relationships: []
      }
      routine_assignment_events: {
        Row: {
          created_at: string
          id: string
          outcome: string
          patient_id: string
          payload: Json
          routine_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          outcome: string
          patient_id: string
          payload: Json
          routine_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string
          patient_id?: string
          payload?: Json
          routine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_assignment_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_assignment_events_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          routine_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          routine_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          routine_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_days_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_items: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: number | null
          rest_seconds: number | null
          routine_day_id: string
          sets: number | null
          target_weight: number | null
          was_modified: boolean
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          reps?: number | null
          rest_seconds?: number | null
          routine_day_id: string
          sets?: number | null
          target_weight?: number | null
          was_modified?: boolean
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          routine_day_id?: string
          sets?: number | null
          target_weight?: number | null
          was_modified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "routine_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_items_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_templates: {
        Row: {
          created_at: string
          days_per_week: number
          environment:
            | Database["public"]["Enums"]["training_environment"]
            | null
          goal: Database["public"]["Enums"]["patient_goal"] | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["professional_specialty"]
          level: Database["public"]["Enums"]["fitness_level"] | null
          name: string
        }
        Insert: {
          created_at?: string
          days_per_week?: number
          environment?:
            | Database["public"]["Enums"]["training_environment"]
            | null
          goal?: Database["public"]["Enums"]["patient_goal"] | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["professional_specialty"]
          level?: Database["public"]["Enums"]["fitness_level"] | null
          name: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          environment?:
            | Database["public"]["Enums"]["training_environment"]
            | null
          goal?: Database["public"]["Enums"]["patient_goal"] | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["professional_specialty"]
          level?: Database["public"]["Enums"]["fitness_level"] | null
          name?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          assigned_by: string | null
          created_at: string
          ends_on: string | null
          id: string
          kind: Database["public"]["Enums"]["professional_specialty"]
          name: string
          notes: string | null
          patient_id: string
          source_template_id: string | null
          starts_on: string | null
          status: Database["public"]["Enums"]["routine_status"]
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          kind: Database["public"]["Enums"]["professional_specialty"]
          name: string
          notes?: string | null
          patient_id: string
          source_template_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["routine_status"]
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["professional_specialty"]
          name?: string
          notes?: string | null
          patient_id?: string
          source_template_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["routine_status"]
        }
        Relationships: [
          {
            foreignKeyName: "routines_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      screenings: {
        Row: {
          bmi: number | null
          body_fat_pct: number | null
          created_at: string
          height_cm: number | null
          id: string
          measurements: Json
          notes: string | null
          patient_id: string
          taken_by: string | null
          taken_on: string
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          body_fat_pct?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          measurements?: Json
          notes?: string | null
          patient_id: string
          taken_by?: string | null
          taken_on?: string
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          body_fat_pct?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          measurements?: Json
          notes?: string | null
          patient_id?: string
          taken_by?: string | null
          taken_on?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "screenings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenings_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          actual_reps: number | null
          actual_sets: number | null
          actual_weight: number | null
          created_at: string
          exercise_id: string | null
          id: string
          notes: string | null
          pain_level: number | null
          pain_location: string | null
          patient_id: string
          perceived_effort: number | null
          prescribed_reps: number | null
          prescribed_sets: number | null
          prescribed_weight: number | null
          replaced_by_exercise_id: string | null
          routine_item_id: string
          session_id: string
          status: Database["public"]["Enums"]["log_status"]
        }
        Insert: {
          actual_reps?: number | null
          actual_sets?: number | null
          actual_weight?: number | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          pain_location?: string | null
          patient_id: string
          perceived_effort?: number | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          prescribed_weight?: number | null
          replaced_by_exercise_id?: string | null
          routine_item_id: string
          session_id: string
          status: Database["public"]["Enums"]["log_status"]
        }
        Update: {
          actual_reps?: number | null
          actual_sets?: number | null
          actual_weight?: number | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          pain_location?: string | null
          patient_id?: string
          perceived_effort?: number | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          prescribed_weight?: number | null
          replaced_by_exercise_id?: string | null
          routine_item_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["log_status"]
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_replaced_by_exercise_id_fkey"
            columns: ["replaced_by_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_routine_item_id_fkey"
            columns: ["routine_item_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          patient_id: string
          performed_on: string
          routine_day_id: string
          routine_id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          patient_id: string
          performed_on?: string
          routine_day_id: string
          routine_id: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          performed_on?: string
          routine_day_id?: string
          routine_id?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      template_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          template_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          template_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          template_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          target_weight: number | null
          template_day_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          target_weight?: number | null
          template_day_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          target_weight?: number | null
          template_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_items_template_day_id_fkey"
            columns: ["template_day_id"]
            isOneToOne: false
            referencedRelation: "template_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actor_is_active: { Args: never; Returns: boolean }
      can_read_routine: { Args: { target_routine: string }; Returns: boolean }
      can_write_routine: { Args: { target_routine: string }; Returns: boolean }
      cancel_person_registration: {
        Args: { registration_token: string }
        Returns: undefined
      }
      commit_routine_assignment: {
        Args: {
          assignment_notes?: string
          excluded_exercises?: string[]
          expected_context: Json
          selected_rule?: string
          target_patient: string
        }
        Returns: Json
      }
      copy_routine_template: {
        Args: { patient_id: string; template_id: string }
        Returns: string
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      deactivate_person: {
        Args: { expected_assignments: number; person_id: string }
        Returns: undefined
      }
      finish_patient_onboarding: {
        Args: { conditions: Json; patient_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      prepare_person_registration: {
        Args: {
          person_email: string
          person_name: string
          person_phone: string
          person_role: Database["public"]["Enums"]["user_role"]
          person_specialty?: Database["public"]["Enums"]["professional_specialty"]
        }
        Returns: string
      }
      review_membership_expiry: {
        Args: { notice_days?: number }
        Returns: Json
      }
      routine_assignment_context: {
        Args: { target_patient: string }
        Returns: Json
      }
      start_routine_session: { Args: { target_day: string }; Returns: string }
      treats_patient: { Args: { target: string }; Returns: boolean }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      alert_type:
        | "pain"
        | "skipped"
        | "membership_expiring"
        | "low_attendance"
        | "routine_assignment"
      billing_period: "monthly" | "quarterly" | "semiannual" | "annual"
      condition_severity: "mild" | "moderate" | "severe"
      fitness_level: "beginner" | "intermediate" | "advanced"
      log_status: "done" | "skipped" | "modified"
      membership_status: "active" | "expiring_soon" | "expired" | "cancelled"
      patient_goal:
        | "lose_weight"
        | "gain_muscle"
        | "performance"
        | "rehab"
        | "general_health"
      professional_specialty: "training" | "physio"
      routine_status: "active" | "completed" | "archived" | "pending_review"
      service_category:
        | "nutrition"
        | "physio"
        | "martial_arts"
        | "workshop"
        | "training"
      session_status: "in_progress" | "completed" | "abandoned"
      training_environment: "home" | "gym"
      user_role: "admin" | "professional" | "patient"
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
      alert_severity: ["info", "warning", "critical"],
      alert_type: [
        "pain",
        "skipped",
        "membership_expiring",
        "low_attendance",
        "routine_assignment",
      ],
      billing_period: ["monthly", "quarterly", "semiannual", "annual"],
      condition_severity: ["mild", "moderate", "severe"],
      fitness_level: ["beginner", "intermediate", "advanced"],
      log_status: ["done", "skipped", "modified"],
      membership_status: ["active", "expiring_soon", "expired", "cancelled"],
      patient_goal: [
        "lose_weight",
        "gain_muscle",
        "performance",
        "rehab",
        "general_health",
      ],
      professional_specialty: ["training", "physio"],
      routine_status: ["active", "completed", "archived", "pending_review"],
      service_category: [
        "nutrition",
        "physio",
        "martial_arts",
        "workshop",
        "training",
      ],
      session_status: ["in_progress", "completed", "abandoned"],
      training_environment: ["home", "gym"],
      user_role: ["admin", "professional", "patient"],
    },
  },
} as const

