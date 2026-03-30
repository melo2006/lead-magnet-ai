import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter } from "lucide-react";
import ProspectSearchForm from "@/components/crm/ProspectSearchForm";
import ProspectTable from "@/components/crm/ProspectTable";
import CRMStats from "@/components/crm/CRMStats";
import CRMFilters from "@/components/crm/CRMFilters";
import OutreachDialog from "@/components/crm/OutreachDialog";
import { useProspectSearch } from "@/hooks/useProspectSearch";
import { useProspects } from "@/hooks/useProspects";

const ProspectsView = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    temperature: "all",
    hasWebsite: "all",
    minScore: 0,
    status: "all",
  });
  const [outreachProspects, setOutreachProspects] = useState<any[] | null>(null);

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

      <ProspectSearchForm
        onSearch={async (params) => {
          await search(params);
          refetch();
        }}
        isSearching={isSearching}
      />

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
