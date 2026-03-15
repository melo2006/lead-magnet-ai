import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export const firecrawlApi = {
  async scanWebsite(leadId: string, websiteUrl: string): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('scan-website', {
      body: { leadId, websiteUrl },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};
