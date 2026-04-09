import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// Apollo.io CSV common column names → prospects table fields
const APOLLO_COLUMN_MAP: Record<string, string> = {
  "first name": "owner_name",
  "last name": "owner_name_last",
  "name": "owner_name",
  "person linkedin url": "linkedin_url",
  "title": "notes",
  "company": "business_name",
  "company name for emails": "business_name",
  "email": "owner_email",
  "email status": "_email_status",
  "phone": "phone",
  "# employees": "_employees",
  "industry": "niche",
  "keywords": "niche",
  "company linkedin url": "linkedin_url",
  "company phone": "phone",
  "website": "website_url",
  "company address": "formatted_address",
  "company city": "city",
  "company state": "state",
  "company country": "country",
  "company postal code": "zip_code",
  "facebook url": "facebook_url",
  "twitter url": "_twitter",
  "seo description": "ai_analysis",
  "technologies": "_tech",
  "annual revenue": "_revenue",
  "departments": "_dept",
  "contact owner": "_contact_owner",
  "stage": "pipeline_stage",
  "lists": "_lists",
  "last contacted": "last_contacted_at",
  "account owner": "_account_owner",
  "mobile phone": "owner_phone",
  "corporate phone": "phone",
  "home phone": "_home_phone",
  "other phone": "_other_phone",
  "personal email": "email",
};

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

interface ParsedRow {
  [key: string]: string;
}

const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Parse CSV respecting quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, "").trim());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return { headers, rows };
};

const PROSPECT_FIELDS = [
  { value: "_skip", label: "⏭️ Skip" },
  { value: "business_name", label: "Business Name" },
  { value: "owner_name", label: "Owner Name" },
  { value: "owner_email", label: "Owner Email" },
  { value: "email", label: "Business Email" },
  { value: "phone", label: "Business Phone" },
  { value: "owner_phone", label: "Owner Phone (Mobile)" },
  { value: "website_url", label: "Website URL" },
  { value: "niche", label: "Industry / Niche" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "country", label: "Country" },
  { value: "zip_code", label: "Zip Code" },
  { value: "formatted_address", label: "Address" },
  { value: "linkedin_url", label: "LinkedIn URL" },
  { value: "facebook_url", label: "Facebook URL" },
  { value: "instagram_url", label: "Instagram URL" },
  { value: "notes", label: "Notes / Title" },
  { value: "pipeline_stage", label: "Pipeline Stage" },
  { value: "ai_analysis", label: "AI Analysis / Description" },
];

const ApolloImportDialog = ({ open, onOpenChange, onImportComplete }: Props) => {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState({ done: 0, total: 0, skipped: 0, errors: 0 });
  const [niche, setNiche] = useState("");
  const [fileName, setFileName] = useState("");

  const resetState = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setColumnMap({});
    setImporting({ done: 0, total: 0, skipped: 0, errors: 0 });
    setNiche("");
    setFileName("");
  };

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);

      // Auto-map columns
      const autoMap: Record<string, string> = {};
      h.forEach(header => {
        const match = APOLLO_COLUMN_MAP[header];
        if (match && !match.startsWith("_")) {
          autoMap[header] = match;
        } else {
          autoMap[header] = "_skip";
        }
      });
      setColumnMap(autoMap);
      setStep("mapping");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFile(file);
    } else {
      toast.error("Please upload a CSV file");
    }
  }, [handleFile]);

  const handleImport = async () => {
    setStep("importing");
    const total = rows.length;
    setImporting({ done: 0, total, skipped: 0, errors: 0 });

    // Build field mapping (which CSV column → which DB column)
    const fieldMap: Record<string, string> = {};
    const firstNameCol = Object.entries(columnMap).find(([, v]) => v === "owner_name")?.[0];
    const lastNameCols = headers.filter(h => {
      const lower = h.toLowerCase();
      return lower === "last name" && columnMap[h] !== "_skip";
    });

    Object.entries(columnMap).forEach(([csvCol, dbCol]) => {
      if (dbCol !== "_skip") {
        fieldMap[csvCol] = dbCol;
      }
    });

    let done = 0;
    let skipped = 0;
    let errors = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const inserts: any[] = [];

      for (const row of batch) {
        const prospect: Record<string, any> = {
          place_id: `apollo_import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          pipeline_stage: "new",
          status: "new",
          ai_analyzed: false,
        };

        // Map CSV columns to DB fields
        Object.entries(fieldMap).forEach(([csvCol, dbCol]) => {
          const val = row[csvCol]?.trim();
          if (val) {
            if (dbCol === "owner_name" && prospect.owner_name) {
              // Append last name
              prospect.owner_name = `${prospect.owner_name} ${val}`.trim();
            } else {
              prospect[dbCol] = val;
            }
          }
        });

        // Handle first+last name combo for Apollo
        if (firstNameCol) {
          const firstName = row[firstNameCol]?.trim() || "";
          const lastNameCol = headers.find(h => h.toLowerCase() === "last name");
          const lastName = lastNameCol ? row[lastNameCol]?.trim() || "" : "";
          if (firstName || lastName) {
            prospect.owner_name = `${firstName} ${lastName}`.trim();
          }
        }

        // Apply default niche if specified
        if (niche && !prospect.niche) {
          prospect.niche = niche;
        }

        // Website URL normalization
        if (prospect.website_url && !prospect.website_url.startsWith("http")) {
          prospect.website_url = `https://${prospect.website_url}`;
        }

        // Must have business_name
        if (!prospect.business_name) {
          skipped++;
          continue;
        }

        // Mark as having contact data if email/phone present
        if (prospect.owner_email || prospect.email) {
          // Already has email — no enrichment needed for email
        }
        if (prospect.owner_phone) {
          // Mark as potentially SMS-capable (mobile from Apollo)
          prospect.sms_capable = true;
          prospect.phone_type = "mobile";
        }

        // Has website? 
        if (prospect.website_url) {
          prospect.has_website = true;
        }

        inserts.push(prospect);
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("prospects").insert(inserts);
        if (error) {
          console.error("Import batch error:", error);
          errors += inserts.length;
        } else {
          done += inserts.length;
        }
      } else {
        skipped += batch.length;
      }

      setImporting({ done: done + skipped + errors, total, skipped, errors });
    }

    setImporting({ done: total, total, skipped, errors });
    setStep("done");
    onImportComplete();
    toast.success(`Imported ${done} prospects (${skipped} skipped, ${errors} errors)`);
  };

  const mappedCount = Object.values(columnMap).filter(v => v !== "_skip").length;
  const hasBizName = Object.values(columnMap).includes("business_name");
  const hasEmail = Object.values(columnMap).includes("owner_email") || Object.values(columnMap).includes("email");
  const hasPhone = Object.values(columnMap).includes("phone") || Object.values(columnMap).includes("owner_phone");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Apollo.io CSV
          </DialogTitle>
          <DialogDescription>
            Import pre-enriched contacts from Apollo.io — skip expensive enrichment for leads that already have email & phone data.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 transition-colors cursor-pointer"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Drop Apollo CSV here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Export from Apollo.io → People → Export → CSV
            </p>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground">{rows.length} rows · {headers.length} columns · {mappedCount} mapped</p>
              </div>
              <div className="flex items-center gap-2">
                {hasBizName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">✓ Company</span>}
                {hasEmail && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">✓ Email</span>}
                {hasPhone && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">✓ Phone</span>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Default Niche / Industry (optional)</label>
              <Input
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="e.g. HVAC, Plumbing, Real Estate"
                className="h-8 text-sm"
              />
            </div>

            <div className="max-h-[40vh] overflow-y-auto space-y-1.5 pr-1">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-3 text-xs">
                  <span className="w-[40%] truncate font-mono text-muted-foreground" title={header}>
                    {header}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={columnMap[header] || "_skip"}
                    onValueChange={v => setColumnMap(prev => ({ ...prev, [header]: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROSPECT_FIELDS.map(f => (
                        <SelectItem key={f.value} value={f.value} className="text-xs">
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview first 3 rows */}
            <div className="border rounded-lg p-3 bg-card/60">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview (first 3 rows)</p>
              <div className="space-y-2">
                {rows.slice(0, 3).map((row, i) => {
                  const mapped: Record<string, string> = {};
                  Object.entries(columnMap).forEach(([csvCol, dbCol]) => {
                    if (dbCol !== "_skip" && row[csvCol]) {
                      mapped[dbCol] = row[csvCol];
                    }
                  });
                  return (
                    <div key={i} className="text-[10px] text-muted-foreground bg-background/50 rounded px-2 py-1 font-mono truncate">
                      {mapped.business_name || "?"} · {mapped.owner_email || mapped.email || "no email"} · {mapped.owner_phone || mapped.phone || "no phone"}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetState}>
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={handleImport} disabled={!hasBizName}>
                <Upload className="w-3.5 h-3.5" />
                Import {rows.length} Prospects
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm font-semibold">Importing prospects...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {importing.done}/{importing.total} processed
              </p>
            </div>
            <Progress value={(importing.done / Math.max(importing.total, 1)) * 100} className="h-2" />
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-foreground">Import Complete!</p>
              <p className="text-xs text-muted-foreground mt-1">
                {importing.total - importing.skipped - importing.errors} imported · {importing.skipped} skipped · {importing.errors} errors
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-3 text-xs text-left space-y-1">
              <p className="font-semibold text-emerald-400">💰 Enrichment savings</p>
              <p className="text-muted-foreground">
                Leads imported with email/phone data <strong>skip enrichment</strong> — saving ~${((importing.total - importing.skipped - importing.errors) * 0.025).toFixed(2)} vs. scraping from scratch.
              </p>
            </div>
            {importing.errors > 0 && (
              <div className="bg-destructive/10 border border-destructive/25 rounded-lg p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{importing.errors} rows failed — likely duplicates or missing required fields.</p>
              </div>
            )}
            <Button size="sm" onClick={() => { resetState(); onOpenChange(false); }}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApolloImportDialog;
