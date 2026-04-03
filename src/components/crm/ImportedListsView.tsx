import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Trash2, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const ImportedListsView = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport] = useState(false);
  const [listName, setListName] = useState("");
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["imported-lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imported_lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("imported_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imported-lists"] });
      toast.success("List deleted");
    },
  });

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = vals[i] || ""));
      return obj;
    });
    return rows;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setListName(file.name.replace(/\.(csv|xlsx?)$/i, "").replace(/_/g, " "));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setCsvData(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData || !listName) return;
    setImporting(true);
    try {
      const { data: list, error: listErr } = await supabase
        .from("imported_lists")
        .insert({ name: listName, source_filename: fileName, lead_count: csvData.length })
        .select()
        .single();
      if (listErr) throw listErr;

      const leads = csvData.map((row) => ({
        list_id: list.id,
        business_name: row["Business Name"] || "Unknown",
        website_url: row["Website"] || null,
        email: row["Email"] || null,
        phone: row["Phone"] || null,
        city: row["City"] || null,
        state: row["State"] || null,
        category: row["Category"] || null,
        social_media_score: parseInt(row["Social Media Score"]) || 0,
        website_quality_score: parseInt(row["Website Quality Score"]) || 0,
        ai_chatbot_detected: row["AI Chatbot Detected"]?.toLowerCase() === "yes",
        lead_score: row["Lead Score"] || "Cold",
        notes: row["Notes"] || null,
      }));

      // Insert in batches of 50
      for (let i = 0; i < leads.length; i += 50) {
        const batch = leads.slice(i, i + 50);
        const { error } = await supabase.from("imported_leads").insert(batch);
        if (error) throw error;
      }

      toast.success(`Imported ${csvData.length} leads into "${listName}"`);
      queryClient.invalidateQueries({ queryKey: ["imported-lists"] });
      setShowImport(false);
      setCsvData(null);
      setListName("");
      setFileName("");
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const getScoreBadge = (score: string) => {
    if (score === "Hot") return "bg-red-500/15 text-red-400";
    if (score === "Medium") return "bg-amber-500/15 text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Imported Lists</h1>
          <p className="text-sm text-muted-foreground">Import and manage lead lists from external sources</p>
        </div>
        <Button onClick={() => setShowImport(true)} size="sm" className="gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Import CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-card animate-pulse border border-border" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl bg-card/50">
          <FileSpreadsheet className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No imported lists yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            Upload a CSV or Excel file with your leads to get started
          </p>
          <Button onClick={() => setShowImport(true)} size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Import your first list
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lists.map((list: any) => (
            <div
              key={list.id}
              onClick={() => navigate(`/imported/${list.id}`)}
              className="group relative p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{list.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {list.lead_count} leads · {list.source_filename}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this list and all its leads?")) deleteMutation.mutate(list.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{new Date(list.created_at).toLocaleDateString()}</span>
                {list.niche && (
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground">{list.niche}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Lead List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">List Name</label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Florida Marine Leads"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">CSV File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {fileName ? fileName : "Click to select a CSV file"}
                </p>
              </button>
            </div>
            {csvData && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-medium text-foreground mb-1">Preview: {csvData.length} rows found</p>
                <div className="text-[10px] text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                  {csvData.slice(0, 5).map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`px-1 py-0.5 rounded ${getScoreBadge(row["Lead Score"])}`}>
                        {row["Lead Score"]}
                      </span>
                      <span className="font-medium text-foreground">{row["Business Name"]}</span>
                      <span>· {row["City"]}, {row["State"]}</span>
                    </div>
                  ))}
                  {csvData.length > 5 && <p className="pt-1">...and {csvData.length - 5} more</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!csvData || !listName || importing}>
              {importing ? "Importing..." : `Import ${csvData?.length || 0} leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportedListsView;
