import { useState, useEffect, useRef } from "react";
import { Save, FolderOpen, Trash2, X, Search, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Filters {
  temperature: string;
  hasWebsite: string;
  minScore: number;
  status: string;
  previewType: string;
  phoneType: string[];
  niche: string[];
  city: string[];
  state: string[];
  hasEmail: string;
  smsCapable: string;
  analyzed: string;
}

export const DEFAULT_FILTERS: Filters = {
  temperature: "all",
  hasWebsite: "all",
  minScore: 0,
  status: "all",
  previewType: "all",
  phoneType: [],
  niche: [],
  city: [],
  state: [],
  hasEmail: "all",
  smsCapable: "all",
  analyzed: "all",
};

interface SavedPreset {
  name: string;
  filters: Filters;
  createdAt: string;
}

const PRESETS_KEY = "crm_filter_presets";

function loadPresets(): SavedPreset[] {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePresets(presets: SavedPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

// Multi-select dropdown component with search
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    onChange(
      selected.includes(val)
        ? selected.filter((s) => s !== val)
        : [...selected, val]
    );
  };

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
      ? selected.join(", ")
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </label>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-1 w-full px-2 py-1 rounded border text-xs text-left transition-colors ${
          selected.length > 0
            ? "bg-primary/10 border-primary/40 text-primary"
            : "bg-secondary border-border text-foreground"
        }`}
      >
        <span className="truncate text-[11px]">{displayText}</span>
        <ChevronDown className="w-2.5 h-2.5 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 rounded bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-2 py-1.5 text-[10px] text-red-400 hover:bg-secondary rounded transition-colors"
              >
                Clear all ({selected.length})
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No matches</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                    selected.includes(opt)
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      selected.includes(opt)
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}
                  >
                    {selected.includes(opt) && (
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    )}
                  </div>
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onApply: () => void;
  niches?: string[];
  cities?: string[];
  states?: string[];
}

const CRMFilters = ({
  filters,
  onChange,
  onApply,
  niches = [],
  cities = [],
  states = [],
}: Props) => {
  const [presets, setPresets] = useState<SavedPreset[]>(loadPresets);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const update = (key: keyof Filters, value: any) =>
    onChange({ ...filters, [key]: value });

  const handleSavePreset = () => {
    if (!saveName.trim()) return;
    const preset: SavedPreset = {
      name: saveName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => [...prev, preset]);
    setSaveName("");
    setShowSave(false);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    onChange({ ...DEFAULT_FILTERS, ...preset.filters });
  };

  const handleDeletePreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => onChange({ ...DEFAULT_FILTERS });

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    const def = DEFAULT_FILTERS[k as keyof Filters];
    if (Array.isArray(v)) return v.length > 0;
    return v !== def;
  }).length;

  const selectClass =
    "w-full px-2 py-1 rounded bg-secondary border border-border text-xs text-foreground focus:outline-none focus:border-primary/50";

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      {/* Save / Load / Reset bar - single compact row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
          Filters{activeCount > 0 && <span className="text-primary ml-1">({activeCount} active)</span>}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeCount > 0 && (
            <button onClick={handleReset} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="w-2.5 h-2.5" /> Reset
            </button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1 rounded bg-secondary border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <FolderOpen className="w-3 h-3" /> Load ({presets.length})
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              {presets.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No saved presets yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {presets.map((p, i) => (
                    <button key={i} onClick={() => handleLoadPreset(p)} className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-secondary text-left group transition-colors">
                      <div>
                        <p className="text-xs font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={(e) => handleDeletePreset(i, e)} className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          {showSave ? (
            <div className="flex items-center gap-1">
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSavePreset()} placeholder="Preset name..." className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] text-foreground w-24 focus:outline-none focus:border-primary/50" autoFocus />
              <button onClick={handleSavePreset} disabled={!saveName.trim()} className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-50">Save</button>
              <button onClick={() => setShowSave(false)} className="p-0.5 text-muted-foreground hover:text-foreground"><X className="w-2.5 h-2.5" /></button>
            </div>
          ) : (
            <button onClick={() => setShowSave(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-primary/20 border border-primary/30 text-[10px] text-primary font-medium hover:bg-primary/30 transition-colors">
              <Save className="w-3 h-3" /> Save
            </button>
          )}
        </div>
      </div>

      {/* All filters in a dense grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 items-end">
        <MultiSelect label="Niche" options={niches} selected={filters.niche as string[]} onChange={(v) => update("niche", v)} placeholder="All Niches" />
        <MultiSelect label="City" options={cities} selected={filters.city as string[]} onChange={(v) => update("city", v)} placeholder="All Cities" />
        <MultiSelect label="State" options={states} selected={filters.state as string[]} onChange={(v) => update("state", v)} placeholder="All States" />
        <MultiSelect label="Phone Type" options={["mobile", "landline", "voip"]} selected={filters.phoneType as string[]} onChange={(v) => update("phoneType", v)} placeholder="All Types" />
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Temperature</label>
          <select value={filters.temperature} onChange={(e) => update("temperature", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">🌡️ Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Website</label>
          <select value={filters.hasWebsite} onChange={(e) => update("hasWebsite", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="yes">Has Website</option>
            <option value="no">No Website</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Has Email</label>
          <select value={filters.hasEmail} onChange={(e) => update("hasEmail", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="yes">✉️ Has Email</option>
            <option value="no">No Email</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">SMS Capable</label>
          <select value={filters.smsCapable} onChange={(e) => update("smsCapable", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="yes">✓ SMS OK</option>
            <option value="no">✗ No SMS</option>
            <option value="unknown">❓ Unknown</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Preview</label>
          <select value={filters.previewType} onChange={(e) => update("previewType", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="iframe">🖥️ iFrame</option>
            <option value="screenshot">📸 Screenshot</option>
            <option value="http">🔗 HTTP</option>
            <option value="none">❌ None</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">AI Analyzed</label>
          <select value={filters.analyzed} onChange={(e) => update("analyzed", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="yes">✓ Analyzed</option>
            <option value="no">Not Analyzed</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Status</label>
          <select value={filters.status} onChange={(e) => update("status", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="demo_sent">Demo Sent</option>
            <option value="interested">Interested</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Min Score</label>
          <div className="flex items-center gap-1">
            <input type="range" min={0} max={100} step={5} value={filters.minScore} onChange={(e) => update("minScore", Number(e.target.value))} className="accent-primary w-16" />
            <span className="text-[10px] font-mono text-muted-foreground w-6">{filters.minScore}</span>
          </div>
        </div>
        {/* Apply button inline with filters */}
        <div className="flex items-end">
          <button onClick={onApply} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm w-full justify-center">
            <Search className="w-3.5 h-3.5" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRMFilters;
