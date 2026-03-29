interface Filters {
  temperature: string;
  hasWebsite: string;
  minScore: number;
  status: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const CRMFilters = ({ filters, onChange }: Props) => {
  const update = (key: keyof Filters, value: any) =>
    onChange({ ...filters, [key]: value });

  const selectClass =
    "px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50";

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Temperature</label>
        <select value={filters.temperature} onChange={(e) => update("temperature", e.target.value)} className={selectClass}>
          <option value="all">All</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">🌡️ Warm</option>
          <option value="cold">❄️ Cold</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Website</label>
        <select value={filters.hasWebsite} onChange={(e) => update("hasWebsite", e.target.value)} className={selectClass}>
          <option value="all">All</option>
          <option value="yes">Has Website</option>
          <option value="no">No Website</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Min Score</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => update("minScore", Number(e.target.value))}
            className="accent-primary w-24"
          />
          <span className="text-xs font-mono text-muted-foreground w-8">{filters.minScore}</span>
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</label>
        <select value={filters.status} onChange={(e) => update("status", e.target.value)} className={selectClass}>
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="demo_sent">Demo Sent</option>
          <option value="interested">Interested</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
  );
};

export default CRMFilters;
