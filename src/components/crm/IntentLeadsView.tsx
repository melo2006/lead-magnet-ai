import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Radar, ExternalLink, ChevronDown, ChevronUp, Flame, Thermometer, Snowflake, Info } from "lucide-react";

const NICHES = [
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

const PLATFORMS = [
  { value: "reddit", label: "Reddit" },
  { value: "google_reviews", label: "Google Reviews" },
  { value: "yelp", label: "Yelp" },
  { value: "facebook", label: "Facebook (Public)" },
  { value: "nextdoor", label: "Nextdoor" },
  { value: "forums", label: "Forums / Web" },
];

const TIME_RANGES = [
  { value: "24h", label: "Last 24 hours" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "3months", label: "Last 3 months" },
];

type IntentLead = {
  source_url: string;
  source_platform: string;
  post_content: string;
  post_title: string | null;
  author_name: string | null;
  niche: string;
  location: string;
  intent_score: number;
  intent_category: string;
  lead_temperature: string;
  ai_summary: string;
  ai_recommended_services: string;
  search_query: string;
};

function TemperatureBadge({ temp }: { temp: string }) {
  if (temp === "hot") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Flame className="w-3 h-3 mr-1" />Hot</Badge>;
  if (temp === "warm") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><Thermometer className="w-3 h-3 mr-1" />Warm</Badge>;
  return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Snowflake className="w-3 h-3 mr-1" />Cold</Badge>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500" : score >= 50 ? "bg-orange-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium">{score}</span>
    </div>
  );
}

export default function IntentLeadsView() {
  const { toast } = useToast();
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [timeRange, setTimeRange] = useState("month");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["reddit", "google_reviews", "yelp", "forums"]);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<IntentLead[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              {results.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {isScanning ? "Scanning..." : "No intent signals found. Try broadening your search."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>AI Summary</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((lead, i) => (
                      <>
                        <TableRow key={i} className="cursor-pointer" onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <p className="text-xs font-medium truncate">{lead.post_title || lead.source_url}</p>
                              {lead.author_name && <p className="text-[11px] text-muted-foreground">by {lead.author_name}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{lead.source_platform}</Badge>
                          </TableCell>
                          <TableCell><ScoreBar score={lead.intent_score} /></TableCell>
                          <TableCell><TemperatureBadge temp={lead.lead_temperature} /></TableCell>
                          <TableCell>
                            <span className="text-xs capitalize">{lead.intent_category?.replace("_", " ")}</span>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-muted-foreground max-w-[250px] truncate">{lead.ai_summary}</p>
                          </TableCell>
                          <TableCell>
                            {expandedRow === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </TableCell>
                        </TableRow>
                        {expandedRow === i && (
                          <TableRow key={`${i}-detail`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                                  <p className="text-sm">{lead.ai_summary}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Services to Pitch</p>
                                  <div className="flex flex-wrap gap-1">
                                    {lead.ai_recommended_services?.split(",").map((s, si) => (
                                      <Badge key={si} variant="secondary" className="text-[10px]">{s.trim()}</Badge>
                                    ))}
                                  </div>
                                </div>
                                {lead.post_content && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Original Post</p>
                                    <p className="text-xs text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap">
                                      {lead.post_content.substring(0, 500)}
                                      {lead.post_content.length > 500 && "..."}
                                    </p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={lead.source_url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3 mr-1" />View Source
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
