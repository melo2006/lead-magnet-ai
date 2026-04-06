import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, Play, Pause, Save, Mail,
  Clock, ChevronDown, ChevronUp, Users, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  campaignId: string;
  campaignStatus: string;
}

interface SequenceStep {
  id?: string;
  sequence_id?: string;
  step_number: number;
  delay_days: number;
  email_subject: string;
  email_template: string;
  sent_count?: number;
  opened_count?: number;
  clicked_count?: number;
}

const CampaignSequenceEditor = ({ campaignId, campaignStatus }: Props) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);

  // Fetch sequences for this campaign
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["campaign-sequences", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_sequences")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const createSequence = useMutation({
    mutationFn: async () => {
      const { data: seq, error } = await supabase
        .from("campaign_sequences")
        .insert({ campaign_id: campaignId, name: "Email Drip Sequence" } as any)
        .select()
        .single();
      if (error) throw error;

      // Create default 5-step sequence
      const defaultSteps = [
        { sequence_id: seq.id, step_number: 1, delay_days: 0, email_subject: "I built something for {business_name}", email_template: "browser_mockup" },
        { sequence_id: seq.id, step_number: 2, delay_days: 3, email_subject: "Quick follow-up for {business_name}", email_template: "clean_card" },
        { sequence_id: seq.id, step_number: 3, delay_days: 4, email_subject: "Has {business_name} ever missed a call?", email_template: "clean_card" },
        { sequence_id: seq.id, step_number: 4, delay_days: 3, email_subject: "40% more bookings for {business_name}?", email_template: "phone_mockup" },
        { sequence_id: seq.id, step_number: 5, delay_days: 4, email_subject: "Last note about your AI demo, {owner_name}", email_template: "clean_card" },
      ];
      const { error: stepsErr } = await supabase.from("campaign_sequence_steps").insert(defaultSteps as any);
      if (stepsErr) throw stepsErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-sequences", campaignId] });
      toast.success("Drip sequence created with 5 steps!");
    },
    onError: () => toast.error("Failed to create sequence"),
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading sequences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Drip Campaign Sequences</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {sequences.length} sequence{sequences.length !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {sequences.length === 0 ? (
            <div className="text-center py-6">
              <Mail className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No drip sequences yet</p>
              <Button
                onClick={() => createSequence.mutate()}
                size="sm"
                className="gap-1.5"
                disabled={createSequence.isPending}
              >
                <Plus className="w-3.5 h-3.5" />
                {createSequence.isPending ? "Creating..." : "Create 5-Step Drip Sequence"}
              </Button>
            </div>
          ) : (
            sequences.map((seq: any) => (
              <SequenceCard
                key={seq.id}
                sequence={seq}
                campaignId={campaignId}
                campaignStatus={campaignStatus}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const SequenceCard = ({ sequence, campaignId, campaignStatus }: { sequence: any; campaignId: string; campaignStatus: string }) => {
  const queryClient = useQueryClient();

  const { data: steps = [] } = useQuery({
    queryKey: ["sequence-steps", sequence.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_sequence_steps")
        .select("*")
        .eq("sequence_id", sequence.id)
        .order("step_number", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: enrollmentCount = 0 } = useQuery({
    queryKey: ["enrollment-count", sequence.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("prospect_sequence_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("sequence_id", sequence.id)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const newStatus = sequence.status === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("campaign_sequences")
        .update({ status: newStatus } as any)
        .eq("id", sequence.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-sequences", campaignId] });
      toast.success(sequence.status === "active" ? "Sequence paused" : "Sequence activated");
    },
  });

  const deleteSequence = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("campaign_sequences")
        .delete()
        .eq("id", sequence.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-sequences", campaignId] });
      toast.success("Sequence deleted");
    },
  });

  const enrollProspects = useMutation({
    mutationFn: async () => {
      // Get campaign filters to find matching prospects
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (!campaign) throw new Error("Campaign not found");

      const filters = (campaign.target_filters as any) || {};
      let query = supabase.from("prospects").select("id, email, owner_email");

      if (filters.temperature && filters.temperature !== "all") query = query.eq("lead_temperature", filters.temperature);
      if (filters.minScore > 0) query = query.gte("lead_score", filters.minScore);
      if (filters.hasWebsite === "yes") query = query.eq("has_website", true);
      if (filters.noChat) query = query.eq("has_chat_widget", false);
      if (filters.noVoice) query = query.eq("has_voice_ai", false);
      if (campaign.niche) query = query.ilike("niche", `%${campaign.niche}%`);

      const { data: prospects } = await query;
      if (!prospects || prospects.length === 0) throw new Error("No matching prospects");

      // Filter to only those with emails
      const withEmail = prospects.filter((p: any) => p.email || p.owner_email);
      if (withEmail.length === 0) throw new Error("No prospects with email addresses");

      // Get first step to calculate initial send time
      const firstStep = steps[0];
      const nextSendAt = new Date();
      if (firstStep) {
        nextSendAt.setDate(nextSendAt.getDate() + firstStep.delay_days);
      }

      // Enroll each prospect (upsert to avoid duplicates)
      const enrollments = withEmail.map((p: any) => ({
        sequence_id: sequence.id,
        prospect_id: p.id,
        current_step: 1,
        status: 'active',
        next_send_at: nextSendAt.toISOString(),
      }));

      // Insert in batches, ignoring conflicts
      for (let i = 0; i < enrollments.length; i += 50) {
        const batch = enrollments.slice(i, i + 50);
        await supabase.from("prospect_sequence_enrollments").upsert(batch as any, {
          onConflict: "sequence_id,prospect_id",
        });
      }

      return withEmail.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-count", sequence.id] });
      toast.success(`Enrolled ${count} prospects into the drip sequence`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to enroll prospects"),
  });

  const statusColor = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-emerald-400/20 text-emerald-400",
    paused: "bg-amber-400/20 text-amber-400",
    completed: "bg-primary/20 text-primary",
  }[sequence.status] || "bg-muted text-muted-foreground";

  const totalSent = steps.reduce((sum: number, s: any) => sum + (s.sent_count || 0), 0);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">{sequence.name}</h4>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                {sequence.status}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {steps.length} steps · {enrollmentCount} active enrollments · {totalSent} emails sent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => enrollProspects.mutate()}
            disabled={enrollProspects.isPending || sequence.status === "completed"}
            className="gap-1 text-xs"
          >
            <Users className="w-3 h-3" />
            {enrollProspects.isPending ? "Enrolling..." : "Enroll Prospects"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleStatus.mutate()}
            className="gap-1 text-xs"
          >
            {sequence.status === "active" ? (
              <><Pause className="w-3 h-3" /> Pause</>
            ) : (
              <><Play className="w-3 h-3" /> Activate</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Delete this sequence?")) deleteSequence.mutate();
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Steps timeline */}
      <div className="border-t border-border bg-secondary/20 p-4">
        <div className="space-y-2">
          {steps.map((step: any, idx: number) => (
            <div key={step.id} className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 shrink-0 w-16">
                <div className={`w-2 h-2 rounded-full ${step.sent_count > 0 ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                <span className="text-[10px] text-muted-foreground font-medium">Step {step.step_number}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 w-20 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {step.delay_days === 0 ? "Immediate" : `Day +${step.delay_days}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{step.email_subject}</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                <span>{step.sent_count || 0} sent</span>
                <span>{step.opened_count || 0} opened</span>
                <span>{step.clicked_count || 0} clicked</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CampaignSequenceEditor;
