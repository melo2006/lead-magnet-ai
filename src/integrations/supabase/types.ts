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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string
          demos_viewed: number | null
          description: string | null
          emails_clicked: number | null
          emails_opened: number | null
          emails_sent: number | null
          id: string
          name: string
          niche: string | null
          prospect_count: number | null
          sms_sent: number | null
          status: string
          target_filters: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          demos_viewed?: number | null
          description?: string | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          id?: string
          name: string
          niche?: string | null
          prospect_count?: number | null
          sms_sent?: number | null
          status?: string
          target_filters?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          demos_viewed?: number | null
          description?: string | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          id?: string
          name?: string
          niche?: string | null
          prospect_count?: number | null
          sms_sent?: number | null
          status?: string
          target_filters?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          brand_colors: Json | null
          brand_fonts: Json | null
          brand_logo: string | null
          business_name: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          niche: string
          phone: string | null
          scan_status: string
          secondary_url: string | null
          status: string
          updated_at: string
          uploaded_files: Json | null
          website_content: string | null
          website_description: string | null
          website_screenshot: string | null
          website_title: string | null
          website_url: string
        }
        Insert: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_logo?: string | null
          business_name: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          niche?: string
          phone?: string | null
          scan_status?: string
          secondary_url?: string | null
          status?: string
          updated_at?: string
          uploaded_files?: Json | null
          website_content?: string | null
          website_description?: string | null
          website_screenshot?: string | null
          website_title?: string | null
          website_url: string
        }
        Update: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_logo?: string | null
          business_name?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          niche?: string
          phone?: string | null
          scan_status?: string
          secondary_url?: string | null
          status?: string
          updated_at?: string
          uploaded_files?: Json | null
          website_content?: string | null
          website_description?: string | null
          website_screenshot?: string | null
          website_title?: string | null
          website_url?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          ai_analysis: string | null
          ai_analyzed: boolean | null
          business_data: Json | null
          business_name: string
          business_types: Json | null
          campaign_id: string | null
          city: string | null
          contact_method: string | null
          country: string | null
          created_at: string
          demo_link: string | null
          demo_viewed_at: string | null
          email: string | null
          email_clicked_at: string | null
          email_opened_at: string | null
          email_sent_at: string | null
          facebook_url: string | null
          formatted_address: string | null
          google_maps_url: string | null
          has_chat_widget: boolean | null
          has_online_booking: boolean | null
          has_voice_ai: boolean | null
          has_website: boolean | null
          id: string
          instagram_url: string | null
          last_contacted_at: string | null
          lead_score: number | null
          lead_temperature: string | null
          linkedin_url: string | null
          location_lat: number | null
          location_lng: number | null
          niche: string | null
          notes: string | null
          opening_hours: Json | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          phone: string | null
          photos: Json | null
          pipeline_stage: string
          place_id: string
          primary_type: string | null
          rating: number | null
          review_count: number | null
          search_location: string | null
          search_query: string | null
          search_radius: number | null
          sms_clicked_at: string | null
          sms_sent_at: string | null
          social_profiles: Json | null
          state: string | null
          status: string | null
          tags: Json | null
          updated_at: string
          website_quality_score: number | null
          website_screenshot: string | null
          website_url: string | null
          whatsapp_number: string | null
          zip_code: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_analyzed?: boolean | null
          business_data?: Json | null
          business_name: string
          business_types?: Json | null
          campaign_id?: string | null
          city?: string | null
          contact_method?: string | null
          country?: string | null
          created_at?: string
          demo_link?: string | null
          demo_viewed_at?: string | null
          email?: string | null
          email_clicked_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          facebook_url?: string | null
          formatted_address?: string | null
          google_maps_url?: string | null
          has_chat_widget?: boolean | null
          has_online_booking?: boolean | null
          has_voice_ai?: boolean | null
          has_website?: boolean | null
          id?: string
          instagram_url?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_temperature?: string | null
          linkedin_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          niche?: string | null
          notes?: string | null
          opening_hours?: Json | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          photos?: Json | null
          pipeline_stage?: string
          place_id: string
          primary_type?: string | null
          rating?: number | null
          review_count?: number | null
          search_location?: string | null
          search_query?: string | null
          search_radius?: number | null
          sms_clicked_at?: string | null
          sms_sent_at?: string | null
          social_profiles?: Json | null
          state?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string
          website_quality_score?: number | null
          website_screenshot?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_analyzed?: boolean | null
          business_data?: Json | null
          business_name?: string
          business_types?: Json | null
          campaign_id?: string | null
          city?: string | null
          contact_method?: string | null
          country?: string | null
          created_at?: string
          demo_link?: string | null
          demo_viewed_at?: string | null
          email?: string | null
          email_clicked_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          facebook_url?: string | null
          formatted_address?: string | null
          google_maps_url?: string | null
          has_chat_widget?: boolean | null
          has_online_booking?: boolean | null
          has_voice_ai?: boolean | null
          has_website?: boolean | null
          id?: string
          instagram_url?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_temperature?: string | null
          linkedin_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          niche?: string | null
          notes?: string | null
          opening_hours?: Json | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          photos?: Json | null
          pipeline_stage?: string
          place_id?: string
          primary_type?: string | null
          rating?: number | null
          review_count?: number | null
          search_location?: string | null
          search_query?: string | null
          search_radius?: number | null
          sms_clicked_at?: string | null
          sms_sent_at?: string | null
          social_profiles?: Json | null
          state?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string
          website_quality_score?: number | null
          website_screenshot?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
