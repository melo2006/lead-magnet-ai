import { Mail, Eye, MousePointerClick, Send, MessageSquare, Users } from "lucide-react";
import type { Prospect } from "@/hooks/useProspectSearch";

interface Props {
  prospects: Prospect[];
}

const CampaignStats = ({ prospects }: Props) => {
  const total = prospects.length;
  const emailsSent = prospects.filter((p) => (p as any).email_sent_at).length;
  const emailsOpened = prospects.filter((p) => (p as any).email_opened_at).length;
  const emailsClicked = prospects.filter((p) => (p as any).email_clicked_at).length;
  const demosViewed = prospects.filter((p) => (p as any).demo_viewed_at).length;
  const smsSent = prospects.filter((p) => (p as any).sms_sent_at).length;

  const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;
  const clickRate = emailsOpened > 0 ? Math.round((emailsClicked / emailsOpened) * 100) : 0;

  const stats = [
    { label: "Prospects", value: total, icon: Users, color: "text-primary" },
    { label: "Emails Sent", value: emailsSent, icon: Mail, color: "text-purple-400" },
    { label: "Opened", value: `${emailsOpened} (${openRate}%)`, icon: Eye, color: "text-emerald-400" },
    { label: "Clicked", value: `${emailsClicked} (${clickRate}%)`, icon: MousePointerClick, color: "text-cyan-400" },
    { label: "Demos Viewed", value: demosViewed, icon: Send, color: "text-amber-400" },
    { label: "SMS Sent", value: smsSent, icon: MessageSquare, color: "text-blue-400" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="bg-card border border-border rounded-lg px-3 py-2.5 text-center">
          <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
          <p className="text-sm font-bold text-foreground">{s.value}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

export default CampaignStats;
