import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect } from "./useProspectSearch";
import type { Filters } from "@/components/crm/CRMFilters";

export type { Filters };

export const useProspects = (filters: Filters) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["prospects", filters],
    queryFn: async () => {
      let query = supabase
        .from("prospects")
        .select("*")
        .order("lead_score", { ascending: false })
        .limit(500);

      if (filters.temperature !== "all") {
        query = query.eq("lead_temperature", filters.temperature);
      }
      if (filters.hasWebsite === "yes") {
        query = query.eq("has_website", true);
      } else if (filters.hasWebsite === "no") {
        query = query.eq("has_website", false);
      }
      if (filters.minScore > 0) {
        query = query.gte("lead_score", filters.minScore);
      }
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      // Multi-select: niche
      if (filters.niche.length > 0) {
        query = query.in("niche", filters.niche);
      }
      // Multi-select: city
      if (filters.city.length > 0) {
        query = query.in("city", filters.city);
      }
      // Multi-select: state
      if (filters.state.length > 0) {
        query = query.in("state", filters.state);
      }
      // Multi-select: phone_type
      if (filters.phoneType.length > 0) {
        query = query.in("phone_type", filters.phoneType);
      }
      if (filters.hasEmail === "yes") {
        query = query.or("email.neq.,owner_email.neq.");
      } else if (filters.hasEmail === "no") {
        query = query.is("email", null).is("owner_email", null);
      }
      if (filters.smsCapable === "yes") {
        query = query.eq("sms_capable", true);
      } else if (filters.smsCapable === "no") {
        query = query.eq("sms_capable", false);
      } else if (filters.smsCapable === "unknown") {
        query = query.is("sms_capable", null);
      }
      if (filters.analyzed === "yes") {
        query = query.eq("ai_analyzed", true);
      } else if (filters.analyzed === "no") {
        query = query.or("ai_analyzed.eq.false,ai_analyzed.is.null");
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Prospect[];
    },
  });

  return { prospects: data || [], isLoading, refetch };
};

// Hook to get distinct filter options (dynamic from DB)
export const useFilterOptions = () => {
  const { data } = useQuery({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const [nicheRes, cityRes, stateRes] = await Promise.all([
        supabase.from("prospects").select("niche").not("niche", "is", null),
        supabase.from("prospects").select("city").not("city", "is", null),
        supabase.from("prospects").select("state").not("state", "is", null),
      ]);
      const niches = [...new Set((nicheRes.data || []).map((r: any) => r.niche).filter(Boolean))].sort();
      const cities = [...new Set((cityRes.data || []).map((r: any) => r.city).filter(Boolean))].sort();
      const states = [...new Set((stateRes.data || []).map((r: any) => r.state).filter(Boolean))].sort();
      return { niches, cities, states };
    },
    staleTime: 30000, // refresh every 30s so new scrapes show up
  });

  return { niches: data?.niches || [], cities: data?.cities || [], states: data?.states || [] };
};
