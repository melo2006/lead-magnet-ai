import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Megaphone, Play, Pause, Trash2, Edit2,
  Users, Mail, Eye, MousePointerClick, Sparkles, X
} from "lucide-react";

const CampaignsView = () => {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("campaigns").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign updated");
    },
  });

  const statusStyles: Record<string, { text: string; cls: string }> = {
    draft: { text: "Draft", cls: "bg-muted text-muted-foreground" },
    active: { text: "Active", cls: "bg-primary/20 text-primary" },
    paused: { text: "Paused", cls: "bg-amber-400/20 text-amber-400" },
    completed: { text: "Completed", cls: "bg-emerald-400/20 text-emerald-400" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Create and manage outreach campaigns</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a campaign to start outreach to your qualified leads</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4" /> Create with AI Wizard
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c: any) => {
            const st = statusStyles[c.status] || statusStyles.draft;
            const openRate = c.emails_sent > 0 ? Math.round((c.emails_opened / c.emails_sent) * 100) : 0;
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-foreground truncate">{c.name}</h3>
                      {c.niche && <p className="text-[11px] text-muted-foreground mt-0.5">{c.niche}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>{st.text}</span>
                  </div>

                  {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <Users className="w-3 h-3 mx-auto text-muted-foreground mb-0.5" />
                      <p className="text-sm font-bold text-foreground">{c.prospect_count}</p>
                      <p className="text-[9px] text-muted-foreground">Prospects</p>
                    </div>
                    <div className="text-center">
                      <Mail className="w-3 h-3 mx-auto text-purple-400 mb-0.5" />
                      <p className="text-sm font-bold text-foreground">{c.emails_sent}</p>
                      <p className="text-[9px] text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center">
                      <Eye className="w-3 h-3 mx-auto text-emerald-400 mb-0.5" />
                      <p className="text-sm font-bold text-foreground">{openRate}%</p>
                      <p className="text-[9px] text-muted-foreground">Open Rate</p>
                    </div>
                    <div className="text-center">
                      <MousePointerClick className="w-3 h-3 mx-auto text-cyan-400 mb-0.5" />
                      <p className="text-sm font-bold text-foreground">{c.demos_viewed}</p>
                      <p className="text-[9px] text-muted-foreground">Demos</p>
                    </div>
                  </div>
                </div>

                {/* Actions bar */}
                <div className="flex items-center border-t border-border">
                  {c.status === "draft" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Play className="w-3 h-3" /> Launch
                    </button>
                  )}
                  {c.status === "active" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: c.id, status: "paused" })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
                    >
                      <Pause className="w-3 h-3" /> Pause
                    </button>
                  )}
                  {c.status === "paused" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Play className="w-3 h-3" /> Resume
                    </button>
                  )}
                  <button
                    onClick={() => deleteCampaign.mutate(c.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border-l border-border"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Wizard */}
      {showCreate && <CreateCampaignWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
};

/* ---- Campaign Creation Wizard ---- */
const CreateCampaignWizard = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [niche, setNiche] = useState("");
  const [filters, setFilters] = useState({
    temperature: "all",
    minScore: 50,
    hasWebsite: "yes",
    noChat: false,
    noVoice: false,
  });
  const queryClient = useQueryClient();

  const { data: matchCount = 0 } = useQuery({
    queryKey: ["campaign-match-count", filters],
    queryFn: async () => {
      let query = supabase.from("prospects").select("id", { count: "exact", head: true });
      if (filters.temperature !== "all") query = query.eq("lead_temperature", filters.temperature);
      if (filters.minScore > 0) query = query.gte("lead_score", filters.minScore);
      if (filters.hasWebsite === "yes") query = query.eq("has_website", true);
      if (filters.noChat) query = query.eq("has_chat_widget", false);
      if (filters.noVoice) query = query.eq("has_voice_ai", false);
      if (niche) query = query.ilike("niche", `%${niche}%`);
      const { count } = await query;
      return count || 0;
    },
    enabled: step >= 2,
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campaigns").insert({
        name,
        description,
        niche: niche || null,
        target_filters: filters,
        prospect_count: matchCount,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created!");
      onClose();
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const nicheOptions = [
    "Roofing", "Plumbing", "HVAC", "Dental", "Real Estate", "Auto Repair",
    "Landscaping", "Med Spa", "Law Firm", "Restaurant", "Gym", "Veterinary",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Create Campaign</h2>
            <p className="text-xs text-muted-foreground">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Campaign Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Miami Roofers - June 2026"
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What's this campaign about?"
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Target Niche</label>
                <div className="flex flex-wrap gap-1.5">
                  {nicheOptions.map((n) => (
                    <button
                      key={n}
                      onClick={() => setNiche(niche === n.toLowerCase() ? "" : n.toLowerCase())}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        niche === n.toLowerCase()
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{matchCount}</p>
                <p className="text-xs text-muted-foreground">prospects match your filters</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Lead Temperature</label>
                  <select
                    value={filters.temperature}
                    onChange={(e) => setFilters({ ...filters, temperature: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground"
                  >
                    <option value="all">All</option>
                    <option value="hot">🔥 Hot only</option>
                    <option value="warm">🌡️ Warm only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Minimum Score: {filters.minScore}</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={filters.minScore}
                    onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.noChat}
                      onChange={(e) => setFilters({ ...filters, noChat: e.target.checked })}
                      className="accent-primary"
                    />
                    No chat widget
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.noVoice}
                      onChange={(e) => setFilters({ ...filters, noVoice: e.target.checked })}
                      className="accent-primary"
                    />
                    No voice AI
                  </label>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Review Campaign</h3>
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{name}</span></div>
                {niche && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Niche</span><span className="font-medium text-foreground capitalize">{niche}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Prospects</span><span className="font-bold text-primary">{matchCount}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Min Score</span><span className="font-medium text-foreground">{filters.minScore}+</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Temperature</span><span className="font-medium text-foreground capitalize">{filters.temperature}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">
                After creating, you can select specific prospects, scrape their websites, preview mockups, and launch the outreach.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
          ) : <div />}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !name.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => createCampaign.mutate()}
              disabled={createCampaign.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {createCampaign.isPending ? "Creating..." : "Create Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignsView;
