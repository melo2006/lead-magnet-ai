import { Flame, Thermometer, Snowflake, Building2 } from "lucide-react";
import type { Prospect } from "@/hooks/useProspectSearch";

interface Props {
  prospects: Prospect[];
}

const CRMStats = ({ prospects }: Props) => {
  const total = prospects.length;
  const hot = prospects.filter((p) => p.lead_temperature === "hot").length;
  const warm = prospects.filter((p) => p.lead_temperature === "warm").length;
  const cold = prospects.filter((p) => p.lead_temperature === "cold").length;
  const noWebsite = prospects.filter((p) => !p.has_website).length;

  const stats = [
    { label: "Total", value: total, icon: Building2, color: "text-primary" },
    { label: "Hot", value: hot, icon: Flame, color: "text-red-400" },
    { label: "Warm", value: warm, icon: Thermometer, color: "text-amber-400" },
    { label: "Cold", value: cold, icon: Snowflake, color: "text-blue-400" },
    { label: "No Website", value: noWebsite, icon: Building2, color: "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="bg-card border border-border rounded-lg px-3 py-2.5 text-center">
          <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
          <p className="text-lg font-bold text-foreground">{s.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

export default CRMStats;
