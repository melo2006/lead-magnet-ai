import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Radar, Flame, Thermometer, Snowflake, Info } from "lucide-react";
import { IntentLead, NICHES, PLATFORMS, TIME_RANGES } from "./intent-leads/types";
import IntentLeadCard from "./intent-leads/IntentLeadCard";
import { CostEstimate, LastScanCost, UsageDashboard } from "./intent-leads/CostTracker";

export default function IntentLeadsView() {
  const { toast } = useToast();
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [timeRange, setTimeRange] = useState("month");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["reddit", "google_reviews", "yelp", "forums"]);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<IntentLead[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastUsage, setLastUsage] = useState<{ firecrawl_calls: number; ai_calls: number; estimated_cost_usd: number } | null>(null);

  const togglePlatform = (val: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const handleScan = async () => {
    if (!niche || !location) {
      toast({ title: "Missing fields", description: "Please select a niche and enter a location.", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    setResults([]);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-intent-leads", {
        body: { niche, location, timeRange, platforms: selectedPlatforms, limit: 5 },
      });

      if (error) throw error;

      if (data?.success) {
        setResults(data.data || []);
        if (data.usage) setLastUsage(data.usage);
        toast({ title: "Scan complete", description: `Found ${data.count || 0} intent signals.` });
      } else {
        toast({ title: "Scan failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({ title: "Error", description: err.message || "Failed to scan", variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const hotCount = results.filter((r) => r.lead_temperature === "hot").length;
  const warmCount = results.filter((r) => r.lead_temperature === "warm").length;
  const coldCount = results.filter((r) => r.lead_temperature === "cold").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intent Lead Scanner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find warm leads by scanning public posts, reviews, and forums for people actively looking for services.
        </p>
      </div>

      {/* Scoring Legend */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">How scoring works</p>
              <div className="flex flex-wrap gap-4">
                <span><Flame className="w-3 h-3 inline text-red-400" /> <strong>Hot (80–100):</strong> Actively seeking service, urgent need</span>
                <span><Thermometer className="w-3 h-3 inline text-orange-400" /> <strong>Warm (50–79):</strong> Expressing need, asking for recommendations</span>
                <span><Snowflake className="w-3 h-3 inline text-blue-400" /> <strong>Cold (&lt;50):</strong> Discussing topic, no clear purchase intent</span>
              </div>
              <p>AI analyzes post content for urgency, service need, recency, and location match.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary" />
            Search Criteria
          </CardTitle>
          <CardDescription>Configure your intent signal search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Niche / Industry</label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger><SelectValue placeholder="Select niche" /></SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Input placeholder="e.g. Miami, FL" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Platforms</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <label key={p.value} className="flex items-center gap-1 text-[11px] cursor-pointer">
                    <Checkbox
                      checked={selectedPlatforms.includes(p.value)}
                      onCheckedChange={() => togglePlatform(p.value)}
                      className="w-3.5 h-3.5"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleScan} disabled={isScanning} className="w-full sm:w-auto">
            {isScanning ? (
              <>
                <Radar className="w-4 h-4 mr-2 animate-spin" />
                Scanning public sources...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Scan for Intent Leads
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <>
          {/* Stats */}
          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Total Found</p>
                <p className="text-2xl font-bold">{results.length}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3 text-red-400" />Hot</p>
                <p className="text-2xl font-bold text-red-400">{hotCount}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Thermometer className="w-3 h-3 text-orange-400" />Warm</p>
                <p className="text-2xl font-bold text-orange-400">{warmCount}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Snowflake className="w-3 h-3 text-blue-400" />Cold</p>
                <p className="text-2xl font-bold text-blue-400">{coldCount}</p>
              </Card>
            </div>
          )}

          {/* Lead Cards */}
          {results.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {isScanning ? "Scanning..." : "No intent signals found. Try broadening your search."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Results — {results.length} leads found
              </h2>
              <p className="text-xs text-muted-foreground -mt-2">
                Click "Reply on Source" to engage directly on the platform where the person posted.
                These are public posts — you can comment, DM, or respond to help them.
              </p>
              {results.map((lead, i) => (
                <IntentLeadCard key={i} lead={lead} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
