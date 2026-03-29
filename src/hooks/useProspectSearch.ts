import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SearchParams {
  query: string;
  location: string;
  radius: number;
  useGeolocation?: boolean;
  lat?: number;
  lng?: number;
}

export interface Prospect {
  id?: string;
  place_id: string;
  business_name: string;
  formatted_address: string;
  phone: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number;
  business_types: string[];
  primary_type: string | null;
  niche: string;
  location_lat: number | null;
  location_lng: number | null;
  city: string;
  state: string;
  zip_code: string;
  photos: any[];
  opening_hours: any;
  has_website: boolean;
  website_quality_score?: number;
  has_chat_widget?: boolean;
  has_voice_ai?: boolean;
  has_online_booking?: boolean;
  lead_score: number;
  lead_temperature: string;
  status?: string;
  notes?: string;
  tags?: string[];
  search_query: string;
  search_location: string;
  search_radius: number;
  created_at?: string;
  updated_at?: string;
}

export const useProspectSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Prospect[]>([]);

  const search = async (params: SearchParams) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-places", {
        body: params,
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Search failed");
      }

      setSearchResults(data.prospects || []);
      toast.success(`Found ${data.count} businesses`);
      return data.prospects;
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error(err.message || "Failed to search. Please try again.");
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  return { search, isSearching, searchResults, setSearchResults };
};
