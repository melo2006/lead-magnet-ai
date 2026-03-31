import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, ChevronDown } from "lucide-react";
import ProspectSearchForm from "@/components/crm/ProspectSearchForm";
import ProspectTable from "@/components/crm/ProspectTable";
import CRMStats from "@/components/crm/CRMStats";
import CRMFilters from "@/components/crm/CRMFilters";
import OutreachDialog from "@/components/crm/OutreachDialog";
import { useProspectSearch } from "@/hooks/useProspectSearch";
import { useProspects } from "@/hooks/useProspects";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ProspectsView = () => {
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
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

  const displayProspects = searchResults.length > 0 ? searchResults : prospects;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Prospects</h1>
          <p className="text-sm text-muted-foreground">Search and manage your business leads</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showFilters ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
        >
          <Filter className="w-3.5 h-3.5" />Filters
        </button>
      </div>

      <CRMStats prospects={displayProspects} />

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
    </div>
  );
};

export default ProspectsView;
