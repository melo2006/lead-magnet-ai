import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter } from "lucide-react";
import ProspectSearchForm from "@/components/crm/ProspectSearchForm";
import ProspectTable from "@/components/crm/ProspectTable";
import CRMStats from "@/components/crm/CRMStats";
import CRMFilters from "@/components/crm/CRMFilters";
import { useProspectSearch } from "@/hooks/useProspectSearch";
import { useProspects } from "@/hooks/useProspects";

const CRM = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    temperature: "all",
    hasWebsite: "all",
    minScore: 0,
    status: "all",
  });

  const { search, isSearching, searchResults } = useProspectSearch();
  const { prospects, isLoading, refetch } = useProspects(filters);

  const displayProspects = searchResults.length > 0 ? searchResults : prospects;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Bar */}
        <CRMStats prospects={displayProspects} />

        {/* Search Section */}
        <ProspectSearchForm
          onSearch={async (params) => {
            await search(params);
            refetch();
          }}
          isSearching={isSearching}
        />

        {/* Filters */}
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

        {/* Results Table */}
        <ProspectTable
          prospects={displayProspects}
          isLoading={isLoading || isSearching}
        />
      </div>
    </div>
  );
};

export default CRM;
