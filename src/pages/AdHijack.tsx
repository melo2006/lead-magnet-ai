import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Radar, Copy, ExternalLink, Sparkles, Trash2, ArrowRight } from "lucide-react";

type Platform = "meta" | "tiktok" | "linkedin" | "google";

interface ScrapedAd {
  id: string;
  platform: Platform;
  advertiser_name: string;
  landing_url: string;
  cta_text: string | null;
  ad_creative_text: string | null;
  ad_media_url: string | null;
  source_ad_url: string | null;
  posted_at: string | null;
  comment_template: string | null;
  status: string;
  prospect_id: string | null;
  scan_job_id: string | null;
  created_at: string;
}

interface ScanJob {
  id: string;
  niche: string;
  location: string | null;
  platforms: string[];
  status: string;
  ads_found: number;
  total_cost_usd: number;
  last_error: string | null;
  created_at: string;
}

const PLATFORMS: { id: Platform; label: string; free: boolean }[] = [
  { id: "meta", label: "Meta (FB+IG)", free: true },
  { id: "tiktok", label: "TikTok", free: false },
  { id: "linkedin", label: "LinkedIn", free: false },
  { id: "google", label: "Google", free: false },
];

export default function AdHijack() {
  const { toast } = useToast();
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["meta"]);
  const [scanning, setScanning] = useState(false);
  const [ads, setAds] = useState<ScrapedAd[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [adsRes, jobsRes] = await Promise.all([
      supabase.from("scraped_ads").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("ad_scan_jobs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (adsRes.data) setAds(adsRes.data as ScrapedAd[]);
    if (jobsRes.data) setJobs(jobsRes.data as ScanJob[]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const runScan = async () => {
    if (!niche.trim() || selectedPlatforms.length === 0) {
      toast({ title: "Niche and at least one platform required", variant: "destructive" });
      return;
    }
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-social-ads", {
        body: { niche: niche.trim(), location: location.trim(), platforms: selectedPlatforms, limit: 25 },
      });
      if (error) throw error;
      toast({
        title: `Scan complete — ${data?.ads_found ?? 0} ads found`,
        description: Object.entries(data?.platform_results ?? {})
          .map(([p, r]: [string, any]) => `${p}: ${r.count}${r.error ? " ⚠" : ""}`)
          .join(" · "),
      });
      await loadData();
    } catch (e: any) {
      toast({
        title: "Scan failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const generateComment = async (ad: ScrapedAd) => {
    setGeneratingFor(ad.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ad-comment", {
        body: { scraped_ad_id: ad.id },
      });
      if (error) throw error;
      setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, comment_template: data.comment } : a)));
      toast({ title: "Comment generated" });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setGeneratingFor(null);
    }
  };

  const convertToProspect = async (ad: ScrapedAd) => {
    try {
      const { data: existing } = await supabase
        .from("prospects")
        .select("id")
        .eq("website_url", ad.landing_url)
        .maybeSingle();

      let prospectId = existing?.id;
      if (!prospectId) {
        const { data: created, error } = await supabase
          .from("prospects")
          .insert({
            business_name: ad.advertiser_name,
            website_url: ad.landing_url,
            niche: ad.metadata && (ad as any).metadata?.niche,
            place_id: `ad_hijack_${ad.id}`,
            contact_method: "ad_hijack",
            notes: `Sourced from ${ad.platform} ad. Ad copy: ${(ad.ad_creative_text ?? "").slice(0, 200)}`,
            tags: ["ad_hijack", ad.platform],
            social_profiles: { [`${ad.platform}_ad_url`]: ad.source_ad_url ?? null },
          })
          .select("id")
          .single();
        if (error) throw error;
        prospectId = created.id;
      }
      await supabase
        .from("scraped_ads")
        .update({ prospect_id: prospectId, status: "converted" })
        .eq("id", ad.id);
      setAds((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, prospect_id: prospectId!, status: "converted" } : a)),
      );
      toast({ title: "Converted to prospect", description: ad.advertiser_name });
    } catch (e: any) {
      toast({ title: "Convert failed", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const deleteAd = async (id: string) => {
    await supabase.from("scraped_ads").delete().eq("id", id);
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Ad <span className="text-primary">Hijack</span> Engine
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Scrape active competitor ads, auto-generate personalized demo links, post smarter comments instead of paying for ads.
        </p>
      </div>

      {/* Scan form */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radar className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">New Scan</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Niche</label>
            <Input
              placeholder="med spa, dentist, roofer…"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="h-9 text-xs mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Location (optional)</label>
            <Input
              placeholder="Miami, FL"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-9 text-xs mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Platforms</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    selectedPlatforms.includes(p.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {p.label} {p.free && <span className="opacity-70">(free)</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Meta uses the official Ad Library API. TikTok / LinkedIn / Google use Apify (~$0.50/1k ads).
          </p>
          <Button onClick={runScan} disabled={scanning} size="sm">
            {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radar className="h-3 w-3" />}
            {scanning ? "Scanning…" : "Run Scan"}
          </Button>
        </div>
      </Card>

      {/* Recent scan jobs */}
      {jobs.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Recent Scans</h2>
          <div className="space-y-1">
            {jobs.slice(0, 5).map((j) => (
              <div key={j.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"} className="text-[9px]">
                    {j.status}
                  </Badge>
                  <span className="font-medium">{j.niche}</span>
                  {j.location && <span className="text-muted-foreground">· {j.location}</span>}
                  <span className="text-muted-foreground">· {j.platforms.join(", ")}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{j.ads_found} ads</span>
                  <span>${Number(j.total_cost_usd).toFixed(2)}</span>
                  <span>{new Date(j.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ads list */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">Scraped Ads ({ads.length})</h2>
        </div>
        {ads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No ads scraped yet. Run your first scan above.</p>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="border border-border rounded p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">{ad.platform}</Badge>
                      <span className="text-xs font-bold truncate">{ad.advertiser_name}</span>
                      <Badge variant={ad.status === "converted" ? "default" : "secondary"} className="text-[9px]">
                        {ad.status}
                      </Badge>
                    </div>
                    {ad.cta_text && <p className="text-[11px] mt-1 font-medium">{ad.cta_text}</p>}
                    {ad.ad_creative_text && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{ad.ad_creative_text}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <a
                        href={ad.landing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-2.5 w-2.5" /> {new URL(ad.landing_url).hostname}
                      </a>
                      {ad.source_ad_url && (
                        <a
                          href={ad.source_ad_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-2.5 w-2.5" /> View ad
                        </a>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteAd(ad.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Action row */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {!ad.prospect_id ? (
                    <Button size="sm" variant="outline" onClick={() => convertToProspect(ad)} className="h-7 text-[10px]">
                      <ArrowRight className="h-3 w-3" /> Convert to Prospect
                    </Button>
                  ) : (
                    <Badge className="text-[9px]">In CRM</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateComment(ad)}
                    disabled={generatingFor === ad.id}
                    className="h-7 text-[10px]"
                  >
                    {generatingFor === ad.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {ad.comment_template ? "Regenerate Comment" : "Generate Comment"}
                  </Button>
                </div>

                {ad.comment_template && (
                  <div className="bg-muted/30 rounded p-2 mt-2">
                    <p className="text-[11px] whitespace-pre-wrap">{ad.comment_template}</p>
                    <div className="flex gap-1.5 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyText(ad.comment_template!)}
                        className="h-6 text-[10px]"
                      >
                        <Copy className="h-3 w-3" /> Copy comment
                      </Button>
                      {ad.source_ad_url && (
                        <a href={ad.source_ad_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                            <ExternalLink className="h-3 w-3" /> Open ad to paste
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        ⚠ Comments are copy-paste only. Never automate posting — it violates platform TOS and risks account bans.
      </p>
    </div>
  );
}
