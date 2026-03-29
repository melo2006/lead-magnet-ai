import { useState } from "react";
import { Search, MapPin, Crosshair, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import type { SearchParams } from "@/hooks/useProspectSearch";

const NICHE_CATEGORIES = [
  {
    label: "🏠 Home Services",
    niches: [
      { value: "roofing companies", label: "Roofing" },
      { value: "plumbers", label: "Plumbers" },
      { value: "electricians", label: "Electricians" },
      { value: "HVAC companies", label: "HVAC" },
      { value: "landscaping companies", label: "Landscaping" },
      { value: "pool cleaning services", label: "Pool Cleaning" },
      { value: "pest control companies", label: "Pest Control" },
      { value: "house cleaning services", label: "House Cleaning" },
      { value: "garage door companies", label: "Garage Doors" },
      { value: "fence companies", label: "Fencing" },
      { value: "painting contractors", label: "Painters" },
      { value: "pressure washing services", label: "Pressure Washing" },
      { value: "septic tank services", label: "Septic" },
      { value: "locksmiths", label: "Locksmiths" },
      { value: "window cleaning services", label: "Window Cleaning" },
      { value: "tree service companies", label: "Tree Service" },
    ],
  },
  {
    label: "🏥 Health & Wellness",
    niches: [
      { value: "dental offices", label: "Dentists" },
      { value: "medical clinics", label: "Medical Clinics" },
      { value: "veterinary clinics", label: "Veterinary" },
      { value: "med spas", label: "Med Spas" },
      { value: "chiropractors", label: "Chiropractors" },
      { value: "physical therapy clinics", label: "Physical Therapy" },
      { value: "optometrists", label: "Optometrists" },
      { value: "dermatology clinics", label: "Dermatology" },
      { value: "mental health therapists", label: "Therapists" },
      { value: "massage therapy", label: "Massage" },
      { value: "acupuncture clinics", label: "Acupuncture" },
      { value: "urgent care clinics", label: "Urgent Care" },
    ],
  },
  {
    label: "🚗 Auto & Marine",
    niches: [
      { value: "auto repair shops", label: "Auto Repair" },
      { value: "mobile auto detailing", label: "Auto Detailing" },
      { value: "tire shops", label: "Tire Shops" },
      { value: "auto body shops", label: "Body Shops" },
      { value: "car dealerships", label: "Car Dealers" },
      { value: "boat repair services", label: "Boat Repair" },
      { value: "boat detailing services", label: "Boat Detailing" },
      { value: "marine services", label: "Marine Services" },
      { value: "motorcycle repair shops", label: "Motorcycle Repair" },
      { value: "RV repair services", label: "RV Repair" },
      { value: "towing companies", label: "Towing" },
    ],
  },
  {
    label: "💼 Professional Services",
    niches: [
      { value: "real estate agents", label: "Realtors" },
      { value: "law firms", label: "Lawyers" },
      { value: "insurance agencies", label: "Insurance" },
      { value: "accounting firms", label: "Accounting" },
      { value: "financial advisors", label: "Financial Advisors" },
      { value: "property management companies", label: "Property Mgmt" },
      { value: "mortgage brokers", label: "Mortgage Brokers" },
      { value: "tax preparation services", label: "Tax Prep" },
      { value: "notary services", label: "Notary" },
      { value: "staffing agencies", label: "Staffing" },
    ],
  },
  {
    label: "🍽️ Food & Hospitality",
    niches: [
      { value: "restaurants", label: "Restaurants" },
      { value: "catering companies", label: "Catering" },
      { value: "food trucks", label: "Food Trucks" },
      { value: "bakeries", label: "Bakeries" },
      { value: "coffee shops", label: "Coffee Shops" },
      { value: "bars and nightclubs", label: "Bars/Nightlife" },
      { value: "event venues", label: "Event Venues" },
      { value: "hotels and motels", label: "Hotels" },
      { value: "wedding planners", label: "Wedding Planners" },
    ],
  },
  {
    label: "💪 Fitness & Personal",
    niches: [
      { value: "fitness gyms", label: "Gyms" },
      { value: "personal trainers", label: "Personal Trainers" },
      { value: "yoga studios", label: "Yoga Studios" },
      { value: "martial arts studios", label: "Martial Arts" },
      { value: "dance studios", label: "Dance Studios" },
      { value: "dog grooming", label: "Dog Grooming" },
      { value: "dog walkers", label: "Dog Walkers" },
      { value: "pet boarding", label: "Pet Boarding" },
      { value: "hair salons", label: "Hair Salons" },
      { value: "barbershops", label: "Barbershops" },
      { value: "nail salons", label: "Nail Salons" },
      { value: "tattoo parlors", label: "Tattoo Parlors" },
      { value: "photography studios", label: "Photography" },
    ],
  },
  {
    label: "🏗️ Construction & Trade",
    niches: [
      { value: "general contractors", label: "General Contractors" },
      { value: "concrete companies", label: "Concrete" },
      { value: "flooring companies", label: "Flooring" },
      { value: "solar panel installers", label: "Solar" },
      { value: "demolition companies", label: "Demolition" },
      { value: "excavation companies", label: "Excavation" },
      { value: "welding services", label: "Welding" },
      { value: "moving companies", label: "Movers" },
      { value: "storage facilities", label: "Storage" },
      { value: "dumpster rental services", label: "Dumpster Rental" },
    ],
  },
  {
    label: "📱 Tech & Education",
    niches: [
      { value: "IT support companies", label: "IT Support" },
      { value: "computer repair shops", label: "Computer Repair" },
      { value: "tutoring services", label: "Tutoring" },
      { value: "driving schools", label: "Driving Schools" },
      { value: "daycare centers", label: "Daycare" },
      { value: "printing services", label: "Printing" },
    ],
  },
];

interface Props {
  onSearch: (params: SearchParams) => Promise<void>;
  isSearching: boolean;
}

const ProspectSearchForm = ({ onSearch, isSearching }: Props) => {
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(20);
  const [customQuery, setCustomQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleNiche = (value: string) => {
    setSelectedNiches((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setCustomQuery("");
  };

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

  const handleSearch = async (useGeo = false, lat?: number, lng?: number) => {
    const queries = customQuery ? [customQuery] : selectedNiches;
    if (queries.length === 0) {
      toast.error("Please select at least one niche or type a custom one");
      return;
    }
    if (!useGeo && (!location || location === "Near me")) {
      toast.error("Please enter a location or use the 'Near Me' button");
      return;
    }

    if (queries.length === 1) {
      await onSearch({
        query: queries[0],
        location: useGeo ? "Near me" : location,
        radius,
        useGeolocation: useGeo,
        lat,
        lng,
      });
    } else {
      // Batch search multiple niches
      setBatchProgress({ current: 0, total: queries.length });
      for (let i = 0; i < queries.length; i++) {
        setBatchProgress({ current: i + 1, total: queries.length });
        await onSearch({
          query: queries[i],
          location: useGeo ? "Near me" : location,
          radius,
          useGeolocation: useGeo,
          lat,
          lng,
        });
        if (i < queries.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      setBatchProgress(null);
      toast.success(`Finished searching ${queries.length} niches`);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Find Prospects</h2>
        </div>
        {selectedNiches.length > 0 && (
          <span className="text-xs text-primary font-medium">{selectedNiches.length} niche{selectedNiches.length > 1 ? "s" : ""} selected</span>
        )}
      </div>

      {/* Niche Categories — Collapsible */}
      <div className="space-y-1.5">
        {NICHE_CATEGORIES.map((cat) => {
          const isOpen = expandedCategories.has(cat.label);
          const selectedInCat = cat.niches.filter((n) => selectedNiches.includes(n.value)).length;
          return (
            <div key={cat.label} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.label)}
                className="w-full flex items-center justify-between px-3 py-2 bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <span className="text-xs font-semibold text-foreground">
                  {cat.label}
                  {selectedInCat > 0 && (
                    <span className="ml-1.5 text-primary">({selectedInCat})</span>
                  )}
                </span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="px-3 py-2 flex flex-wrap gap-1.5">
                  {cat.niches.map((n) => (
                    <button
                      key={n.value}
                      onClick={() => toggleNiche(n.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        selectedNiches.includes(n.value)
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const allValues = cat.niches.map((n) => n.value);
                      const allSelected = allValues.every((v) => selectedNiches.includes(v));
                      if (allSelected) {
                        setSelectedNiches((prev) => prev.filter((v) => !allValues.includes(v)));
                      } else {
                        setSelectedNiches((prev) => [...new Set([...prev, ...allValues])]);
                      }
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-primary/30 text-primary/70 hover:bg-primary/10 transition-colors"
                  >
                    {cat.niches.every((n) => selectedNiches.includes(n.value)) ? "Deselect All" : "Select All"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom query */}
      <input
        type="text"
        placeholder="Or type a custom niche (e.g. 'pool cleaning services')"
        value={customQuery}
        onChange={(e) => { setCustomQuery(e.target.value); setSelectedNiches([]); }}
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

      {/* Progress Bar */}
      {batchProgress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Searching niche {batchProgress.current} of {batchProgress.total}...</span>
            <span className="font-mono text-primary font-semibold">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Search Button */}
      <button
        onClick={() => handleSearch()}
        disabled={isSearching || !!batchProgress}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {isSearching || batchProgress ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {batchProgress
              ? `Searching niche ${batchProgress.current}/${batchProgress.total}...`
              : "Searching Google Places..."}
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            {selectedNiches.length > 1
              ? `Search ${selectedNiches.length} Niches (Batch)`
              : "Search Businesses"}
          </>
        )}
      </button>
    </div>
  );
};

export default ProspectSearchForm;
