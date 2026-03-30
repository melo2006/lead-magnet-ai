export type IntentLead = {
  source_url: string;
  source_platform: string;
  post_content: string;
  post_title: string | null;
  author_name: string | null;
  author_profile_url: string | null;
  niche: string;
  location: string;
  intent_score: number;
  intent_category: string;
  lead_temperature: string;
  ai_summary: string;
  ai_recommended_services: string;
  search_query: string;
  search_niche?: string;
  search_location?: string;
  created_at?: string;
};

export const NICHES = [
  { value: "roofing", label: "Roofing" },
  { value: "dental", label: "Dental" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "pet-grooming", label: "Pet Grooming" },
  { value: "auto-repair", label: "Auto Repair" },
  { value: "realtors", label: "Realtors" },
  { value: "landscaping", label: "Landscaping" },
  { value: "home-cleaning", label: "Home Cleaning" },
  { value: "electrical", label: "Electrical" },
];

export const PLATFORMS = [
  { value: "reddit", label: "Reddit" },
  { value: "google_reviews", label: "Google Reviews" },
  { value: "yelp", label: "Yelp" },
  { value: "facebook", label: "Facebook (Public)" },
  { value: "nextdoor", label: "Nextdoor" },
  { value: "forums", label: "Forums / Web" },
];

export const TIME_RANGES = [
  { value: "24h", label: "Last 24 hours" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "3months", label: "Last 3 months" },
];
