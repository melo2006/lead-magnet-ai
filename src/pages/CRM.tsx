import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, ChevronLeft, Zap } from "lucide-react";
import { Link } from "react-router-dom";
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
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-lg font-bold font-display tracking-tight">
                Lead<span className="text-primary">Engine</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                showFilters
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>
        </div>
      </header>

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
