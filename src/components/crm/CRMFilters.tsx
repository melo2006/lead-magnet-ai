import { useState, useEffect } from "react";
import { Save, FolderOpen, Trash2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Filters {
  temperature: string;
  hasWebsite: string;
  minScore: number;
  status: string;
  previewType: string;
  phoneType: string;
  niche: string;
  city: string;
  state: string;
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
  phoneType: "all",
  niche: "all",
  city: "all",
  state: "all",
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

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  niches?: string[];
  cities?: string[];
  states?: string[];
}

const CRMFilters = ({ filters, onChange, niches = [], cities = [], states = [] }: Props) => {
  const [presets, setPresets] = useState<SavedPreset[]>(loadPresets);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => { savePresets(presets); }, [presets]);

  const update = (key: keyof Filters, value: any) =>
    onChange({ ...filters, [key]: value });

  const handleSavePreset = () => {
    if (!saveName.trim()) return;
    const preset: SavedPreset = { name: saveName.trim(), filters: { ...filters }, createdAt: new Date().toISOString() };
    setPresets(prev => [...prev, preset]);
    setSaveName("");
    setShowSave(false);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    onChange({ ...DEFAULT_FILTERS, ...preset.filters });
  };

  const handleDeletePreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(prev => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => onChange({ ...DEFAULT_FILTERS });

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    const def = DEFAULT_FILTERS[k as keyof Filters];
    return v !== def;
  }).length;

  const selectClass =
    "px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50";

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Save / Load / Reset bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Filters {activeCount > 0 && <span className="text-primary">({activeCount} active)</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={handleReset} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
                <FolderOpen className="w-3.5 h-3.5" /> Load ({presets.length})
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              {presets.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No saved presets yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {presets.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleLoadPreset(p)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary text-left group transition-colors"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={(e) => handleDeletePreset(i, e)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {showSave ? (
            <div className="flex items-center gap-1">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                placeholder="Preset name..."
                className="px-2 py-1 rounded-lg bg-secondary border border-border text-xs text-foreground w-32 focus:outline-none focus:border-primary/50"
                autoFocus
              />
              <button onClick={handleSavePreset} disabled={!saveName.trim()} className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
                Save
              </button>
              <button onClick={() => setShowSave(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-xs text-primary font-medium hover:bg-primary/30 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Preset
            </button>
          )}
        </div>
      </div>

      {/* Filter Row 1 */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Niche</label>
          <select value={filters.niche} onChange={(e) => update("niche", e.target.value)} className={selectClass}>
            <option value="all">All Niches</option>
            {niches.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">City</label>
          <select value={filters.city} onChange={(e) => update("city", e.target.value)} className={selectClass}>
            <option value="all">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">State</label>
          <select value={filters.state} onChange={(e) => update("state", e.target.value)} className={selectClass}>
            <option value="all">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
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
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Has Email</label>
          <select value={filters.hasEmail} onChange={(e) => update("hasEmail", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="yes">✉️ Has Email</option>
            <option value="no">No Email</option>
          </select>
        </div>
      </div>

      {/* Filter Row 2 */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">SMS Capable</label>
          <select value={filters.smsCapable} onChange={(e) => update("smsCapable", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="yes">✓ SMS OK</option>
            <option value="no">✗ No SMS</option>
            <option value="unknown">❓ Unknown</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Phone Type</label>
          <select value={filters.phoneType} onChange={(e) => update("phoneType", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="mobile">📱 Mobile</option>
            <option value="landline">📞 Landline</option>
            <option value="voip">🌐 VoIP</option>
            <option value="unknown">❓ Unknown</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Preview Type</label>
          <select value={filters.previewType} onChange={(e) => update("previewType", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="iframe">🖥️ iFrame</option>
            <option value="screenshot">📸 Screenshot</option>
            <option value="http">🔗 HTTP Only</option>
            <option value="none">❌ No Website</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">AI Analyzed</label>
          <select value={filters.analyzed} onChange={(e) => update("analyzed", e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="yes">✓ Analyzed</option>
            <option value="no">Not Analyzed</option>
          </select>
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
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Min Score</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={100} step={5} value={filters.minScore} onChange={(e) => update("minScore", Number(e.target.value))} className="accent-primary w-24" />
            <span className="text-xs font-mono text-muted-foreground w-8">{filters.minScore}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMFilters;
