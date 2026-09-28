export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      auth_email_log: {
        Row: {
          created_at: string;
          email: string;
          email_type: string;
          id: string;
          sent_at: string;
          subject: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          email_type: string;
          id?: string;
          sent_at?: string;
          subject?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          email_type?: string;
          id?: string;
          sent_at?: string;
          subject?: string | null;
        };
        Relationships: [];
      };
      captain_posts: {
        Row: {
          body: string;
          category: string;
          content_type: string | null;
          created_at: string;
          created_by: string;
          file_name: string | null;
          file_path: string | null;
          id: string;
          pinned: boolean;
          published: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          category?: string;
          content_type?: string | null;
          created_at?: string;
          created_by: string;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          pinned?: boolean;
          published?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          category?: string;
          content_type?: string | null;
          created_at?: string;
          created_by?: string;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          pinned?: boolean;
          published?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          department: string;
          email: string;
          emergency: boolean;
          hours: string;
          id: string;
          internal_only: boolean;
          name: string;
          phone: string;
          region: string;
          role: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          updated_by_email: string | null;
        };
        Insert: {
          active?: boolean;
          category?: string;
          created_at?: string;
          department?: string;
          email?: string;
          emergency?: boolean;
          hours?: string;
          id?: string;
          internal_only?: boolean;
          name: string;
          phone?: string;
          region?: string;
          role?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          updated_by_email?: string | null;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          department?: string;
          email?: string;
          emergency?: boolean;
          hours?: string;
          id?: string;
          internal_only?: boolean;
          name?: string;
          phone?: string;
          region?: string;
          role?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          updated_by_email?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string;
          description: string;
          end_time: string | null;
          event_date: string;
          flier_name: string | null;
          flier_path: string | null;
          flier_url: string | null;
          id: string;
          location: string | null;
          published: boolean;
          start_time: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by: string;
          description?: string;
          end_time?: string | null;
          event_date: string;
          flier_name?: string | null;
          flier_path?: string | null;
          flier_url?: string | null;
          id?: string;
          location?: string | null;
          published?: boolean;
          start_time?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          end_time?: string | null;
          event_date?: string;
          flier_name?: string | null;
          flier_path?: string | null;
          flier_url?: string | null;
          id?: string;
          location?: string | null;
          published?: boolean;
          start_time?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      faqs: {
        Row: {
          body: string;
          category: string;
          created_at: string;
          hidden: boolean;
          id: string;
          is_builtin: boolean;
          keywords: string[];
          source_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          category: string;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          is_builtin?: boolean;
          keywords?: string[];
          source_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          category?: string;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          is_builtin?: boolean;
          keywords?: string[];
          source_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fundraiser_approvals: {
        Row: {
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          decision: string;
          id: string;
          note: string | null;
          request_id: string;
          stage: string;
        };
        Insert: {
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          decision: string;
          id?: string;
          note?: string | null;
          request_id: string;
          stage: string;
        };
        Update: {
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          decision?: string;
          id?: string;
          note?: string | null;
          request_id?: string;
          stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fundraiser_approvals_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "fundraiser_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraiser_audit: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          details: Json;
          fundraiser_id: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          fundraiser_id: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          fundraiser_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fundraiser_audit_fundraiser_id_fkey";
            columns: ["fundraiser_id"];
            isOneToOne: false;
            referencedRelation: "fundraisers";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraiser_entries: {
        Row: {
          bid_amount: number | null;
          created_at: string;
          entry_number: number | null;
          fundraiser_id: string;
          id: string;
          is_winner: boolean;
          item_id: string | null;
          kind: string;
          order_id: string | null;
          supporter_email: string;
          supporter_name: string;
        };
        Insert: {
          bid_amount?: number | null;
          created_at?: string;
          entry_number?: number | null;
          fundraiser_id: string;
          id?: string;
          is_winner?: boolean;
          item_id?: string | null;
          kind?: string;
          order_id?: string | null;
          supporter_email?: string;
          supporter_name?: string;
        };
        Update: {
          bid_amount?: number | null;
          created_at?: string;
          entry_number?: number | null;
          fundraiser_id?: string;
          id?: string;
          is_winner?: boolean;
          item_id?: string | null;
          kind?: string;
          order_id?: string | null;
          supporter_email?: string;
          supporter_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fundraiser_entries_fundraiser_id_fkey";
            columns: ["fundraiser_id"];
            isOneToOne: false;
            referencedRelation: "fundraisers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fundraiser_entries_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "fundraiser_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fundraiser_entries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "fundraiser_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraiser_items: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          entries_per_unit: number;
          fundraiser_id: string;
          id: string;
          label: string;
          max_per_order: number;
          quantity_available: number | null;
          quantity_sold: number;
          sort_order: number;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          entries_per_unit?: number;
          fundraiser_id: string;
          id?: string;
          label: string;
          max_per_order?: number;
          quantity_available?: number | null;
          quantity_sold?: number;
          sort_order?: number;
          unit_price?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          entries_per_unit?: number;
          fundraiser_id?: string;
          id?: string;
          label?: string;
          max_per_order?: number;
          quantity_available?: number | null;
          quantity_sold?: number;
          sort_order?: number;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fundraiser_items_fundraiser_id_fkey";
            columns: ["fundraiser_id"];
            isOneToOne: false;
            referencedRelation: "fundraisers";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraiser_orders: {
        Row: {
          amount: number;
          anonymous: boolean;
          created_at: string;
          fee_amount: number;
          fundraiser_id: string;
          id: string;
          item_id: string | null;
          message: string;
          net_amount: number;
          paid_at: string | null;
          provider: string;
          provider_payment_id: string | null;
          provider_session_id: string | null;
          quantity: number;
          refunded_at: string | null;
          status: string;
          supporter_email: string;
          supporter_name: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          anonymous?: boolean;
          created_at?: string;
          fee_amount?: number;
          fundraiser_id: string;
          id?: string;
          item_id?: string | null;
          message?: string;
          net_amount?: number;
          paid_at?: string | null;
          provider?: string;
          provider_payment_id?: string | null;
          provider_session_id?: string | null;
          quantity?: number;
          refunded_at?: string | null;
          status?: string;
          supporter_email?: string;
          supporter_name?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          anonymous?: boolean;
          created_at?: string;
          fee_amount?: number;
          fundraiser_id?: string;
          id?: string;
          item_id?: string | null;
          message?: string;
          net_amount?: number;
          paid_at?: string | null;
          provider?: string;
          provider_payment_id?: string | null;
          provider_session_id?: string | null;
          quantity?: number;
          refunded_at?: string | null;
          status?: string;
          supporter_email?: string;
          supporter_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fundraiser_orders_fundraiser_id_fkey";
            columns: ["fundraiser_id"];
            isOneToOne: false;
            referencedRelation: "fundraisers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fundraiser_orders_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "fundraiser_items";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraiser_payouts: {
        Row: {
          created_at: string;
          fee_amount: number;
          fundraiser_id: string;
          gross_amount: number;
          id: string;
          net_amount: number;
          notes: string;
          recipient: string;
          recorded_by: string | null;
          recorded_by_email: string | null;
          reference: string;
          transfer_date: string;
        };
        Insert: {
          created_at?: string;
          fee_amount?: number;
          fundraiser_id: string;
          gross_amount?: number;
          id?: string;
          net_amount?: number;
          notes?: string;
          recipient: string;
          recorded_by?: string | null;
          recorded_by_email?: string | null;
          reference?: string;
          transfer_date: string;
        };
        Update: {
          created_at?: string;
          fee_amount?: number;
          fundraiser_id?: string;
          gross_amount?: number;
          id?: string;
          net_amount?: number;
          notes?: string;
          recipient?: string;
          recorded_by?: string | null;
          recorded_by_email?: string | null;
          reference?: string;
          transfer_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fundraiser_payouts_fundraiser_id_fkey";
            columns: ["fundraiser_id"];
            isOneToOne: false;
            referencedRelation: "fundraisers";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraiser_requests: {
        Row: {
          alcohol_details: string;
          captain_id: string | null;
          captain_status: string;
          cochair_status: string;
          compliance_status: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contract_needed: boolean | null;
          created_at: string;
          description: string;
          end_time: string | null;
          event_date: string;
          event_id: string | null;
          event_type: string;
          expected_attendance: number | null;
          facilities_approved: boolean | null;
          flier_name: string | null;
          flier_path: string | null;
          food_policy_acknowledged: boolean | null;
          food_truck: boolean | null;
          fundraising_method: string | null;
          id: string;
          legal_status: string;
          liability_waiver_needed: boolean | null;
          location: string | null;
          marketing_status: string;
          on_huntington_property: boolean | null;
          risk_status: string;
          season: string;
          serves_alcohol: boolean | null;
          serves_food: boolean | null;
          start_time: string | null;
          status: string;
          submitted_by: string;
          title: string;
          updated_at: string;
          uses_logos: boolean | null;
        };
        Insert: {
          alcohol_details?: string;
          captain_id?: string | null;
          captain_status?: string;
          cochair_status?: string;
          compliance_status?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contract_needed?: boolean | null;
          created_at?: string;
          description?: string;
          end_time?: string | null;
          event_date: string;
          event_id?: string | null;
          event_type?: string;
          expected_attendance?: number | null;
          facilities_approved?: boolean | null;
          flier_name?: string | null;
          flier_path?: string | null;
          food_policy_acknowledged?: boolean | null;
          food_truck?: boolean | null;
          fundraising_method?: string | null;
          id?: string;
          legal_status?: string;
          liability_waiver_needed?: boolean | null;
          location?: string | null;
          marketing_status?: string;
          on_huntington_property?: boolean | null;
          risk_status?: string;
          season?: string;
          serves_alcohol?: boolean | null;
          serves_food?: boolean | null;
          start_time?: string | null;
          status?: string;
          submitted_by: string;
          title: string;
          updated_at?: string;
          uses_logos?: boolean | null;
        };
        Update: {
          alcohol_details?: string;
          captain_id?: string | null;
          captain_status?: string;
          cochair_status?: string;
          compliance_status?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contract_needed?: boolean | null;
          created_at?: string;
          description?: string;
          end_time?: string | null;
          event_date?: string;
          event_id?: string | null;
          event_type?: string;
          expected_attendance?: number | null;
          facilities_approved?: boolean | null;
          flier_name?: string | null;
          flier_path?: string | null;
          food_policy_acknowledged?: boolean | null;
          food_truck?: boolean | null;
          fundraising_method?: string | null;
          id?: string;
          legal_status?: string;
          liability_waiver_needed?: boolean | null;
          location?: string | null;
          marketing_status?: string;
          on_huntington_property?: boolean | null;
          risk_status?: string;
          season?: string;
          serves_alcohol?: boolean | null;
          serves_food?: boolean | null;
          start_time?: string | null;
          status?: string;
          submitted_by?: string;
          title?: string;
          updated_at?: string;
          uses_logos?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "fundraiser_requests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraisers: {
        Row: {
          allow_custom_amount: boolean;
          beneficiary: string;
          closed_at: string | null;
          closes_at: string | null;
          contact_email: string | null;
          cover_name: string | null;
          cover_path: string | null;
          created_at: string;
          currency: string;
          draw_at: string | null;
          flier_content_type: string | null;
          flier_name: string | null;
          flier_path: string | null;
          goal_amount: number;
          hidden_at: string | null;
          hidden_by: string | null;
          id: string;
          is_demo: boolean;
          kind: string;
          min_custom_amount: number;
          opens_at: string | null;
          organizer_id: string;
          organizer_name: string;
          public_hidden: boolean;
          published_at: string | null;
          request_id: string | null;
          season: string;
          slug: string;
          status: string;
          story: string;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          allow_custom_amount?: boolean;
          beneficiary?: string;
          closed_at?: string | null;
          closes_at?: string | null;
          contact_email?: string | null;
          cover_name?: string | null;
          cover_path?: string | null;
          created_at?: string;
          currency?: string;
          draw_at?: string | null;
          flier_content_type?: string | null;
          flier_name?: string | null;
          flier_path?: string | null;
          goal_amount?: number;
          hidden_at?: string | null;
          hidden_by?: string | null;
          id?: string;
          is_demo?: boolean;
          kind?: string;
          min_custom_amount?: number;
          opens_at?: string | null;
          organizer_id: string;
          organizer_name?: string;
          public_hidden?: boolean;
          published_at?: string | null;
          request_id?: string | null;
          season?: string;
          slug: string;
          status?: string;
          story?: string;
          summary?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          allow_custom_amount?: boolean;
          beneficiary?: string;
          closed_at?: string | null;
          closes_at?: string | null;
          contact_email?: string | null;
          cover_name?: string | null;
          cover_path?: string | null;
          created_at?: string;
          currency?: string;
          draw_at?: string | null;
          flier_content_type?: string | null;
          flier_name?: string | null;
          flier_path?: string | null;
          goal_amount?: number;
          hidden_at?: string | null;
          hidden_by?: string | null;
          id?: string;
          is_demo?: boolean;
          kind?: string;
          min_custom_amount?: number;
          opens_at?: string | null;
          organizer_id?: string;
          organizer_name?: string;
          public_hidden?: boolean;
          published_at?: string | null;
          request_id?: string | null;
          season?: string;
          slug?: string;
          status?: string;
          story?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fundraisers_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "fundraiser_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      fundraising_assets: {
        Row: {
          category: string;
          content_type: string | null;
          created_at: string;
          created_by: string;
          description: string;
          file_name: string | null;
          file_path: string | null;
          id: string;
          link_url: string | null;
          published: boolean;
          sort_order: number;
          suggested_caption: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string;
          content_type?: string | null;
          created_at?: string;
          created_by: string;
          description?: string;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          link_url?: string | null;
          published?: boolean;
          sort_order?: number;
          suggested_caption?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          content_type?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          link_url?: string | null;
          published?: boolean;
          sort_order?: number;
          suggested_caption?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hub_bootstrap_admins: {
        Row: {
          created_at: string;
          email: string;
        };
        Insert: {
          created_at?: string;
          email: string;
        };
        Update: {
          created_at?: string;
          email?: string;
        };
        Relationships: [];
      };
      hub_email_allowlist: {
        Row: {
          created_at: string;
          email: string;
          note: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          note?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          note?: string;
        };
        Relationships: [];
      };
      message_audit: {
        Row: {
          action: string;
          actor_email: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          message_id: string;
        };
        Insert: {
          action: string;
          actor_email?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          message_id: string;
        };
        Update: {
          action?: string;
          actor_email?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          message_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_audit_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      message_recipients: {
        Row: {
          created_at: string;
          dismissed_at: string | null;
          email: string;
          id: string;
          message_id: string;
          name: string;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dismissed_at?: string | null;
          email?: string;
          id?: string;
          message_id: string;
          name?: string;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dismissed_at?: string | null;
          email?: string;
          id?: string;
          message_id?: string;
          name?: string;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_recipients_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          audience: Json;
          body: string;
          category: string;
          created_at: string;
          created_by: string;
          created_by_email: string;
          cta_href: string;
          cta_label: string;
          email_exclude_user_ids: Json;
          email_notify: boolean;
          email_sent_count: number;
          email_skipped_count: number;
          id: string;
          priority: string;
          recipient_count: number;
          scheduled_at: string | null;
          sent_at: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: Json;
          body?: string;
          category?: string;
          created_at?: string;
          created_by: string;
          created_by_email?: string;
          cta_href?: string;
          cta_label?: string;
          email_exclude_user_ids?: Json;
          email_notify?: boolean;
          email_sent_count?: number;
          email_skipped_count?: number;
          id?: string;
          priority?: string;
          recipient_count?: number;
          scheduled_at?: string | null;
          sent_at?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: Json;
          body?: string;
          category?: string;
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          cta_href?: string;
          cta_label?: string;
          email_exclude_user_ids?: Json;
          email_notify?: boolean;
          email_sent_count?: number;
          email_skipped_count?: number;
          id?: string;
          priority?: string;
          recipient_count?: number;
          scheduled_at?: string | null;
          sent_at?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          address: Json;
          apparel: Json;
          audit: Json;
          bike: Json;
          created_at: string;
          manual_entry: boolean;
          participation: string | null;
          pelotonia: Json;
          reg_id: string | null;
          season: string;
          season_locked: boolean;
          submitted_at: string | null;
          travel: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: Json;
          apparel?: Json;
          audit?: Json;
          bike?: Json;
          created_at?: string;
          manual_entry?: boolean;
          participation?: string | null;
          pelotonia?: Json;
          reg_id?: string | null;
          season?: string;
          season_locked?: boolean;
          submitted_at?: string | null;
          travel?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: Json;
          apparel?: Json;
          audit?: Json;
          bike?: Json;
          created_at?: string;
          manual_entry?: boolean;
          participation?: string | null;
          pelotonia?: Json;
          reg_id?: string | null;
          season?: string;
          season_locked?: boolean;
          submitted_at?: string | null;
          travel?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pelotonia_kids_campaigns: {
        Row: {
          goal: number | null;
          name: string;
          raised: number;
          slug: string;
          synced_at: string;
          url: string;
        };
        Insert: {
          goal?: number | null;
          name: string;
          raised?: number;
          slug: string;
          synced_at?: string;
          url: string;
        };
        Update: {
          goal?: number | null;
          name?: string;
          raised?: number;
          slug?: string;
          synced_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      pelotonia_pelotons: {
        Row: {
          all_time_raised: number;
          captain_name: string | null;
          current_event: string | null;
          general_peloton_funds: number;
          goal: number;
          id: string;
          level: string | null;
          members_count: number;
          name: string;
          parent_id: string | null;
          raised: number;
          raised_by_members: number;
          raw: Json;
          short_name: string;
          synced_at: string;
        };
        Insert: {
          all_time_raised?: number;
          captain_name?: string | null;
          current_event?: string | null;
          general_peloton_funds?: number;
          goal?: number;
          id: string;
          level?: string | null;
          members_count?: number;
          name: string;
          parent_id?: string | null;
          raised?: number;
          raised_by_members?: number;
          raw?: Json;
          short_name: string;
          synced_at?: string;
        };
        Update: {
          all_time_raised?: number;
          captain_name?: string | null;
          current_event?: string | null;
          general_peloton_funds?: number;
          goal?: number;
          id?: string;
          level?: string | null;
          members_count?: number;
          name?: string;
          parent_id?: string | null;
          raised?: number;
          raised_by_members?: number;
          raw?: Json;
          short_name?: string;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pelotonia_pelotons_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "pelotonia_pelotons";
            referencedColumns: ["id"];
          },
        ];
      };
      pelotonia_riders: {
        Row: {
          all_time_raised: number;
          commitment: number;
          current_event: string | null;
          first_name: string | null;
          goal: number;
          is_captain: boolean;
          is_challenger: boolean;
          is_high_roller: boolean;
          is_peloton_admin: boolean;
          is_researcher: boolean;
          is_rider: boolean;
          is_survivor: boolean;
          is_volunteer: boolean;
          last_name: string | null;
          list_synced_at: string;
          name: string;
          peloton_id: string | null;
          profile_image_url: string | null;
          profile_synced_at: string | null;
          public_id: string;
          raised: number;
          raw_profile: Json | null;
          registration_types: string[];
          ride_types: string[];
          route_ids: string[];
          route_names: string[];
          tags: string[];
        };
        Insert: {
          all_time_raised?: number;
          commitment?: number;
          current_event?: string | null;
          first_name?: string | null;
          goal?: number;
          is_captain?: boolean;
          is_challenger?: boolean;
          is_high_roller?: boolean;
          is_peloton_admin?: boolean;
          is_researcher?: boolean;
          is_rider?: boolean;
          is_survivor?: boolean;
          is_volunteer?: boolean;
          last_name?: string | null;
          list_synced_at?: string;
          name?: string;
          peloton_id?: string | null;
          profile_image_url?: string | null;
          profile_synced_at?: string | null;
          public_id: string;
          raised?: number;
          raw_profile?: Json | null;
          registration_types?: string[];
          ride_types?: string[];
          route_ids?: string[];
          route_names?: string[];
          tags?: string[];
        };
        Update: {
          all_time_raised?: number;
          commitment?: number;
          current_event?: string | null;
          first_name?: string | null;
          goal?: number;
          is_captain?: boolean;
          is_challenger?: boolean;
          is_high_roller?: boolean;
          is_peloton_admin?: boolean;
          is_researcher?: boolean;
          is_rider?: boolean;
          is_survivor?: boolean;
          is_volunteer?: boolean;
          last_name?: string | null;
          list_synced_at?: string;
          name?: string;
          peloton_id?: string | null;
          profile_image_url?: string | null;
          profile_synced_at?: string | null;
          public_id?: string;
          raised?: number;
          raw_profile?: Json | null;
          registration_types?: string[];
          ride_types?: string[];
          route_ids?: string[];
          route_names?: string[];
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "pelotonia_riders_peloton_id_fkey";
            columns: ["peloton_id"];
            isOneToOne: false;
            referencedRelation: "pelotonia_pelotons";
            referencedColumns: ["id"];
          },
        ];
      };
      pelotonia_rides: {
        Row: {
          id: string;
          is_signature: boolean;
          lower_distance_deadline: string | null;
          name: string;
          registration_end: string | null;
          registration_fees: Json;
          registration_start: string | null;
          status: string | null;
          synced_at: string;
          type: string | null;
          volunteer_registration_end: string | null;
          volunteer_registration_start: string | null;
          weekend_end: string | null;
          weekend_start: string | null;
          withdraw_deadline: string | null;
        };
        Insert: {
          id: string;
          is_signature?: boolean;
          lower_distance_deadline?: string | null;
          name: string;
          registration_end?: string | null;
          registration_fees?: Json;
          registration_start?: string | null;
          status?: string | null;
          synced_at?: string;
          type?: string | null;
          volunteer_registration_end?: string | null;
          volunteer_registration_start?: string | null;
          weekend_end?: string | null;
          weekend_start?: string | null;
          withdraw_deadline?: string | null;
        };
        Update: {
          id?: string;
          is_signature?: boolean;
          lower_distance_deadline?: string | null;
          name?: string;
          registration_end?: string | null;
          registration_fees?: Json;
          registration_start?: string | null;
          status?: string | null;
          synced_at?: string;
          type?: string | null;
          volunteer_registration_end?: string | null;
          volunteer_registration_start?: string | null;
          weekend_end?: string | null;
          weekend_start?: string | null;
          withdraw_deadline?: string | null;
        };
        Relationships: [];
      };
      pelotonia_routes: {
        Row: {
          capacity: number | null;
          description: string | null;
          difficulty: string | null;
          distance: number | null;
          duration: string | null;
          fundraising_commitment: number | null;
          highest_incline: number | null;
          id: string;
          image_url: string | null;
          map_url: string | null;
          name: string;
          registration_count: number | null;
          ride_id: string | null;
          start_date: string | null;
          synced_at: string;
          tags: string[];
        };
        Insert: {
          capacity?: number | null;
          description?: string | null;
          difficulty?: string | null;
          distance?: number | null;
          duration?: string | null;
          fundraising_commitment?: number | null;
          highest_incline?: number | null;
          id: string;
          image_url?: string | null;
          map_url?: string | null;
          name: string;
          registration_count?: number | null;
          ride_id?: string | null;
          start_date?: string | null;
          synced_at?: string;
          tags?: string[];
        };
        Update: {
          capacity?: number | null;
          description?: string | null;
          difficulty?: string | null;
          distance?: number | null;
          duration?: string | null;
          fundraising_commitment?: number | null;
          highest_incline?: number | null;
          id?: string;
          image_url?: string | null;
          map_url?: string | null;
          name?: string;
          registration_count?: number | null;
          ride_id?: string | null;
          start_date?: string | null;
          synced_at?: string;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "pelotonia_routes_ride_id_fkey";
            columns: ["ride_id"];
            isOneToOne: false;
            referencedRelation: "pelotonia_rides";
            referencedColumns: ["id"];
          },
        ];
      };
      pelotonia_sync_runs: {
        Row: {
          errors: number;
          finished_at: string | null;
          id: number;
          note: string | null;
          pelotons: number;
          profiles_fetched: number;
          requests: number;
          riders_listed: number;
          started_at: string;
          status: string;
        };
        Insert: {
          errors?: number;
          finished_at?: string | null;
          id?: number;
          note?: string | null;
          pelotons?: number;
          profiles_fetched?: number;
          requests?: number;
          riders_listed?: number;
          started_at?: string;
          status?: string;
        };
        Update: {
          errors?: number;
          finished_at?: string | null;
          id?: number;
          note?: string | null;
          pelotons?: number;
          profiles_fetched?: number;
          requests?: number;
          riders_listed?: number;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      pelotonia_team_snapshots: {
        Row: {
          captured_at: string;
          challengers: number;
          goal: number;
          high_rollers: number;
          kids_raised: number;
          members_count: number;
          raised: number;
          riders: number;
          snapshot_date: string;
          survivors: number;
          volunteers: number;
        };
        Insert: {
          captured_at?: string;
          challengers?: number;
          goal: number;
          high_rollers?: number;
          kids_raised?: number;
          members_count: number;
          raised: number;
          riders?: number;
          snapshot_date: string;
          survivors?: number;
          volunteers?: number;
        };
        Update: {
          captured_at?: string;
          challengers?: number;
          goal?: number;
          high_rollers?: number;
          kids_raised?: number;
          members_count?: number;
          raised?: number;
          riders?: number;
          snapshot_date?: string;
          survivors?: number;
          volunteers?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          activated_at: string | null;
          avatar_content_type: string | null;
          avatar_path: string | null;
          avatar_updated_at: string | null;
          consent: boolean;
          created_at: string;
          email: string | null;
          email_opt_out: boolean;
          full_name: string | null;
          has_vendor_dashboard_access: boolean;
          id: string;
          manager: string | null;
          market: string | null;
          mobile: string | null;
          password_set_at: string | null;
          region: string;
          segment: string | null;
          updated_at: string;
        };
        Insert: {
          activated_at?: string | null;
          avatar_content_type?: string | null;
          avatar_path?: string | null;
          avatar_updated_at?: string | null;
          consent?: boolean;
          created_at?: string;
          email?: string | null;
          email_opt_out?: boolean;
          full_name?: string | null;
          has_vendor_dashboard_access?: boolean;
          id: string;
          manager?: string | null;
          market?: string | null;
          mobile?: string | null;
          password_set_at?: string | null;
          region?: string;
          segment?: string | null;
          updated_at?: string;
        };
        Update: {
          activated_at?: string | null;
          avatar_content_type?: string | null;
          avatar_path?: string | null;
          avatar_updated_at?: string | null;
          consent?: boolean;
          created_at?: string;
          email?: string | null;
          email_opt_out?: boolean;
          full_name?: string | null;
          has_vendor_dashboard_access?: boolean;
          id?: string;
          manager?: string | null;
          market?: string | null;
          mobile?: string | null;
          password_set_at?: string | null;
          region?: string;
          segment?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      register_content: {
        Row: {
          content: Json;
          id: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          content?: Json;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          content?: Json;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      signin_attempts: {
        Row: {
          created_at: string;
          email_key: string;
          failures: number;
          id: string;
          locked_until: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email_key: string;
          failures?: number;
          id?: string;
          locked_until?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email_key?: string;
          failures?: number;
          id?: string;
          locked_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_branding: {
        Row: {
          hero_accent_color: string;
          hero_content_type: string | null;
          hero_name: string | null;
          hero_overlay: number;
          hero_path: string | null;
          hero_position: string;
          hero_primary_button_color: string;
          hero_secondary_button_color: string;
          hero_supporting_color: string;
          hero_text_color: string;
          id: number;
          logo_content_type: string | null;
          logo_name: string | null;
          logo_path: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          hero_accent_color?: string;
          hero_content_type?: string | null;
          hero_name?: string | null;
          hero_overlay?: number;
          hero_path?: string | null;
          hero_position?: string;
          hero_primary_button_color?: string;
          hero_secondary_button_color?: string;
          hero_supporting_color?: string;
          hero_text_color?: string;
          id?: number;
          logo_content_type?: string | null;
          logo_name?: string | null;
          logo_path?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          hero_accent_color?: string;
          hero_content_type?: string | null;
          hero_name?: string | null;
          hero_overlay?: number;
          hero_path?: string | null;
          hero_position?: string;
          hero_primary_button_color?: string;
          hero_secondary_button_color?: string;
          hero_supporting_color?: string;
          hero_text_color?: string;
          id?: number;
          logo_content_type?: string | null;
          logo_name?: string | null;
          logo_path?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          fundraiser_pages_enabled: boolean;
          id: number;
          updated_at: string;
          updated_by: string | null;
          vendor_crm_enabled: boolean;
        };
        Insert: {
          fundraiser_pages_enabled?: boolean;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
          vendor_crm_enabled?: boolean;
        };
        Update: {
          fundraiser_pages_enabled?: boolean;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
          vendor_crm_enabled?: boolean;
        };
        Relationships: [];
      };
      site_visits: {
        Row: {
          count: number;
          id: number;
          updated_at: string;
        };
        Insert: {
          count?: number;
          id: number;
          updated_at?: string;
        };
        Update: {
          count?: number;
          id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_event_audit: {
        Row: {
          action: string;
          actor_email: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          event_id: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_email?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          event_id: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_email?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          event_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_event_audit_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "team_events";
            referencedColumns: ["id"];
          },
        ];
      };
      team_event_invitees: {
        Row: {
          created_at: string;
          email: string;
          event_id: string;
          id: string;
          name: string;
          notified_at: string | null;
          responded_at: string | null;
          rsvp: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string;
          event_id: string;
          id?: string;
          name?: string;
          notified_at?: string | null;
          responded_at?: string | null;
          rsvp?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          event_id?: string;
          id?: string;
          name?: string;
          notified_at?: string | null;
          responded_at?: string | null;
          rsvp?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_event_invitees_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "team_events";
            referencedColumns: ["id"];
          },
        ];
      };
      team_events: {
        Row: {
          audience: Json;
          cancelled_at: string | null;
          created_at: string;
          created_by: string;
          created_by_email: string;
          description: string;
          end_time: string | null;
          event_date: string;
          flier_content_type: string | null;
          flier_name: string | null;
          flier_path: string | null;
          id: string;
          invited_count: number;
          location: string | null;
          organizer_email: string;
          organizer_name: string;
          published_at: string | null;
          start_time: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: Json;
          cancelled_at?: string | null;
          created_at?: string;
          created_by: string;
          created_by_email?: string;
          description?: string;
          end_time?: string | null;
          event_date: string;
          flier_content_type?: string | null;
          flier_name?: string | null;
          flier_path?: string | null;
          id?: string;
          invited_count?: number;
          location?: string | null;
          organizer_email?: string;
          organizer_name?: string;
          published_at?: string | null;
          start_time?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: Json;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          description?: string;
          end_time?: string | null;
          event_date?: string;
          flier_content_type?: string | null;
          flier_name?: string | null;
          flier_path?: string | null;
          id?: string;
          invited_count?: number;
          location?: string | null;
          organizer_email?: string;
          organizer_name?: string;
          published_at?: string | null;
          start_time?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vendor_activity: {
        Row: {
          contact_date: string;
          contact_method: string;
          contacted_by: string;
          created_at: string;
          created_by: string | null;
          id: string;
          interaction_notes: string;
          next_step: string;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          contact_date: string;
          contact_method?: string;
          contacted_by?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          interaction_notes?: string;
          next_step?: string;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          contact_date?: string;
          contact_method?: string;
          contacted_by?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          interaction_notes?: string;
          next_step?: string;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_activity_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_attachments: {
        Row: {
          archived: boolean;
          content_type: string | null;
          created_at: string;
          file_name: string;
          file_path: string;
          id: string;
          size_bytes: number | null;
          uploaded_by: string;
          vendor_id: string;
        };
        Insert: {
          archived?: boolean;
          content_type?: string | null;
          created_at?: string;
          file_name: string;
          file_path: string;
          id?: string;
          size_bytes?: number | null;
          uploaded_by: string;
          vendor_id: string;
        };
        Update: {
          archived?: boolean;
          content_type?: string | null;
          created_at?: string;
          file_name?: string;
          file_path?: string;
          id?: string;
          size_bytes?: number | null;
          uploaded_by?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_attachments_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_audit: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          vendor_id: string;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          vendor_id: string;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_audit_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_contacts: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          sort_order: number;
          title: string | null;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_donations: {
        Row: {
          actual_donated_amount: number;
          committed_amount: number;
          created_at: string;
          id: string;
          kids_amount: number;
          notes: string;
          recipient: string;
          updated_at: string;
          vendor_id: string;
          year: number;
        };
        Insert: {
          actual_donated_amount?: number;
          committed_amount?: number;
          created_at?: string;
          id?: string;
          kids_amount?: number;
          notes?: string;
          recipient?: string;
          updated_at?: string;
          vendor_id: string;
          year: number;
        };
        Update: {
          actual_donated_amount?: number;
          committed_amount?: number;
          created_at?: string;
          id?: string;
          kids_amount?: number;
          notes?: string;
          recipient?: string;
          updated_at?: string;
          vendor_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_donations_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_rider_slots: {
        Row: {
          bike_needed: boolean;
          bike_size: string;
          created_at: string;
          hotel_check_in: string | null;
          hotel_check_out: string | null;
          hotel_needed: boolean;
          id: string;
          pelotonia_id: string;
          rider_name: string;
          slot_number: number;
          updated_at: string;
          updated_by: string | null;
          vendor_id: string;
          year: number;
        };
        Insert: {
          bike_needed?: boolean;
          bike_size?: string;
          created_at?: string;
          hotel_check_in?: string | null;
          hotel_check_out?: string | null;
          hotel_needed?: boolean;
          id?: string;
          pelotonia_id?: string;
          rider_name?: string;
          slot_number: number;
          updated_at?: string;
          updated_by?: string | null;
          vendor_id: string;
          year: number;
        };
        Update: {
          bike_needed?: boolean;
          bike_size?: string;
          created_at?: string;
          hotel_check_in?: string | null;
          hotel_check_out?: string | null;
          hotel_needed?: boolean;
          id?: string;
          pelotonia_id?: string;
          rider_name?: string;
          slot_number?: number;
          updated_at?: string;
          updated_by?: string | null;
          vendor_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_rider_slots_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_spend: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          notes: string;
          updated_at: string;
          vendor_id: string;
          year: number;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          id?: string;
          notes?: string;
          updated_at?: string;
          vendor_id: string;
          year: number;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          notes?: string;
          updated_at?: string;
          vendor_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_spend_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          archived: boolean;
          archived_at: string | null;
          archived_by: string | null;
          business_name: string;
          business_segment: string | null;
          created_at: string;
          created_by: string;
          general_notes: string;
          id: string;
          internal_business_segment: string | null;
          internal_notes: string;
          primary_contact_name: string | null;
          primary_contact_phone: string | null;
          relationship_owner: string | null;
          secondary_relationship_owner: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          archived?: boolean;
          archived_at?: string | null;
          archived_by?: string | null;
          business_name: string;
          business_segment?: string | null;
          created_at?: string;
          created_by: string;
          general_notes?: string;
          id?: string;
          internal_business_segment?: string | null;
          internal_notes?: string;
          primary_contact_name?: string | null;
          primary_contact_phone?: string | null;
          relationship_owner?: string | null;
          secondary_relationship_owner?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          archived?: boolean;
          archived_at?: string | null;
          archived_by?: string | null;
          business_name?: string;
          business_segment?: string | null;
          created_at?: string;
          created_by?: string;
          general_notes?: string;
          id?: string;
          internal_business_segment?: string | null;
          internal_notes?: string;
          primary_contact_name?: string | null;
          primary_contact_phone?: string | null;
          relationship_owner?: string | null;
          secondary_relationship_owner?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      pelotonia_subteam_stats: {
        Row: {
          challengers: number | null;
          committed: number | null;
          high_rollers: number | null;
          id: string | null;
          members_count: number | null;
          name: string | null;
          raised: number | null;
          riders: number | null;
          survivors: number | null;
          volunteers: number | null;
        };
        Relationships: [];
      };
      pelotonia_team_stats: {
        Row: {
          challengers: number | null;
          high_rollers: number | null;
          last_profile_sync: string | null;
          members: number | null;
          profiles_synced: number | null;
          riders: number | null;
          survivors: number | null;
          total_committed: number | null;
          volunteers: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      before_huntington_user_created: { Args: { event: Json }; Returns: Json };
      can_archive_vendors: { Args: { _user_id: string }; Returns: boolean };
      can_manage_events: { Args: { _user_id: string }; Returns: boolean };
      can_manage_team_events: { Args: { _user_id: string }; Returns: boolean };
      can_purge_vendors: { Args: { _user_id: string }; Returns: boolean };
      can_send_messages: { Args: { _user_id: string }; Returns: boolean };
      can_view_vendors: { Args: { _user_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_site_visits: { Args: never; Returns: number };
      is_admin_text: { Args: { _user_id: string }; Returns: boolean };
      is_fundraiser_reviewer: { Args: { _user_id: string }; Returns: boolean };
      is_leadership: { Args: { _user_id: string }; Returns: boolean };
      is_superuser: { Args: { _user_id: string }; Returns: boolean };
      profile_privileged_unchanged: {
        Args: { _id: string; _vendor_access: boolean };
        Returns: boolean;
      };
    };
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "user"
        | "captain"
        | "legal"
        | "risk"
        | "compliance"
        | "marketing"
        | "cochair"
        | "superuser"
        | "vendor_captain";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "editor",
        "user",
        "captain",
        "legal",
        "risk",
        "compliance",
        "marketing",
        "cochair",
        "superuser",
        "vendor_captain",
      ],
    },
  },
} as const;
