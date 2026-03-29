import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect } from "./useProspectSearch";

interface Filters {
  temperature: string;
  hasWebsite: string;
  minScore: number;
  status: string;
}

export const useProspects = (filters: Filters) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["prospects", filters],
    queryFn: async () => {
      let query = supabase
        .from("prospects")
        .select("*")
        .order("lead_score", { ascending: false })
        .limit(200);

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

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Prospect[];
    },
  });

  return { prospects: data || [], isLoading, refetch };
};
