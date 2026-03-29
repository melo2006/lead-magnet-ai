import { useState } from "react";
import { Search, MapPin, Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SearchParams } from "@/hooks/useProspectSearch";

const NICHE_OPTIONS = [
  { value: "roofing companies", label: "🏠 Roofing" },
  { value: "real estate agents", label: "🏡 Realtors" },
  { value: "plumbers", label: "🔧 Plumbers" },
  { value: "electricians", label: "⚡ Electricians" },
  { value: "HVAC companies", label: "❄️ HVAC" },
  { value: "dental offices", label: "🦷 Dentists" },
  { value: "law firms", label: "⚖️ Lawyers" },
  { value: "restaurants", label: "🍽️ Restaurants" },
  { value: "auto repair shops", label: "🚗 Auto Repair" },
  { value: "landscaping companies", label: "🌿 Landscaping" },
  { value: "insurance agencies", label: "🛡️ Insurance" },
  { value: "fitness gyms", label: "💪 Gyms" },
  { value: "medical clinics", label: "🏥 Medical" },
  { value: "veterinary clinics", label: "🐾 Veterinary" },
  { value: "accounting firms", label: "📊 Accounting" },
];

interface Props {
  onSearch: (params: SearchParams) => Promise<void>;
  isSearching: boolean;
}

const ProspectSearchForm = ({ onSearch, isSearching }: Props) => {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(20);
  const [customQuery, setCustomQuery] = useState("");

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation("Near me");
        handleSearch(true, pos.coords.latitude, pos.coords.longitude);
      },
      () => toast.error("Unable to get your location. Please enter it manually.")
    );
  };

  const handleSearch = (useGeo = false, lat?: number, lng?: number) => {
    const searchQuery = customQuery || query;
    if (!searchQuery) {
      toast.error("Please select or type a business niche");
      return;
    }
    if (!useGeo && (!location || location === "Near me")) {
      toast.error("Please enter a location or use the 'Near Me' button");
      return;
    }
    onSearch({
      query: searchQuery,
      location: useGeo ? "Near me" : location,
      radius,
      useGeolocation: useGeo,
      lat,
      lng,
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Find Prospects</h2>
      </div>

      {/* Niche Quick Picks */}
      <div className="flex flex-wrap gap-1.5">
        {NICHE_OPTIONS.map((n) => (
          <button
            key={n.value}
            onClick={() => { setQuery(n.value); setCustomQuery(""); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
              query === n.value
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Custom query */}
      <input
        type="text"
        placeholder="Or type a custom niche (e.g. 'pool cleaning services')"
        value={customQuery}
        onChange={(e) => { setCustomQuery(e.target.value); setQuery(""); }}
        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
      />

      {/* Location + Radius */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="City, zip code, or address..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <button
          onClick={handleNearMe}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/20 border border-accent/30 text-accent-foreground text-xs font-medium hover:bg-accent/30 transition-colors whitespace-nowrap"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Near Me
        </button>

        <div className="flex items-center gap-2 min-w-[160px]">
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs font-mono text-muted-foreground w-12 text-right">{radius} mi</span>
        </div>
      </div>

      {/* Search Button */}
      <button
        onClick={() => handleSearch()}
        disabled={isSearching}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {isSearching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching Google Places...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Search Businesses
          </>
        )}
      </button>
    </div>
  );
};

export default ProspectSearchForm;
