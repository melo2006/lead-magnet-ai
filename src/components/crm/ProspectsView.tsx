import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, UserPlus, X } from "lucide-react";
import ProspectSearchForm from "@/components/crm/ProspectSearchForm";
import ProspectTable from "@/components/crm/ProspectTable";
import CRMStats from "@/components/crm/CRMStats";
import CRMFilters from "@/components/crm/CRMFilters";
import OutreachDialog from "@/components/crm/OutreachDialog";
import QuickAddProspectDialog from "@/components/crm/QuickAddProspectDialog";
import { useProspectSearch } from "@/hooks/useProspectSearch";
import { useProspects } from "@/hooks/useProspects";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ProspectsView = () => {
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [filters, setFilters] = useState({
    temperature: searchParams.get("temp") || "all",
    hasWebsite: "all",
    minScore: 0,
    status: searchParams.get("status") || "all",
  });
  const [outreachProspects, setOutreachProspects] = useState<any[] | null>(null);

  useEffect(() => {
    const temp = searchParams.get("temp");
    const status = searchParams.get("status");
    if (temp || status) {
      setFilters(f => ({
        ...f,
        temperature: temp || "all",
        status: status || "all",
      }));
      setShowFilters(true);
    }
  }, [searchParams]);

  const { search, isSearching, searchResults } = useProspectSearch();
  const { prospects, isLoading, refetch } = useProspects(filters);

  const baseProspects = searchResults.length > 0 ? searchResults : prospects;

  const displayProspects = useMemo(() => {
    if (!quickSearch.trim()) return baseProspects;
    const q = quickSearch.toLowerCase();
    return baseProspects.filter(p =>
      p.business_name?.toLowerCase().includes(q) ||
      (p as any).city?.toLowerCase().includes(q) ||
      (p as any).state?.toLowerCase().includes(q) ||
      p.niche?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      (p as any).owner_name?.toLowerCase().includes(q) ||
      p.formatted_address?.toLowerCase().includes(q)
    );
  }, [baseProspects, quickSearch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Prospects</h1>
          <p className="text-sm text-muted-foreground">Search and manage your business leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />Quick Add
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showFilters ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
          >
            <Filter className="w-3.5 h-3.5" />Filters
          </button>
        </div>
      </div>

      <CRMStats prospects={displayProspects} />

      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          placeholder="Search prospects by name, city, state, niche, phone, owner..."
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        {quickSearch && (
          <button onClick={() => setQuickSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="search" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Find Prospects</span>
              {isSearching && <span className="text-[10px] text-primary animate-pulse">Searching...</span>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            <ProspectSearchForm
              onSearch={async (params) => {
                await search(params);
                refetch();
              }}
              isSearching={isSearching}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <CRMFilters filters={filters} onChange={setFilters} />
          </motion.div>
        )}
      </AnimatePresence>

      <ProspectTable
        prospects={displayProspects}
        isLoading={isLoading || isSearching}
        onRefetch={refetch}
        onOutreach={(selected) => setOutreachProspects(selected)}
      />

      {outreachProspects && outreachProspects.length > 0 && (
        <OutreachDialog
          prospects={outreachProspects}
          onClose={() => setOutreachProspects(null)}
          onSent={() => { setOutreachProspects(null); refetch(); }}
        />
      )}

      <QuickAddProspectDialog
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onAdded={refetch}
      />
    </div>
  );
};

export default ProspectsView;
