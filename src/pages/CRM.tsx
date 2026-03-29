import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Table2, Filter, BarChart3 } from "lucide-react";
import ProspectSearchForm from "@/components/crm/ProspectSearchForm";
import ProspectTable from "@/components/crm/ProspectTable";
import PipelineView from "@/components/crm/PipelineView";
import CRMStats from "@/components/crm/CRMStats";
import CampaignStats from "@/components/crm/CampaignStats";
import CRMFilters from "@/components/crm/CRMFilters";
import OutreachDialog from "@/components/crm/OutreachDialog";
import { useProspectSearch } from "@/hooks/useProspectSearch";
import { useProspects } from "@/hooks/useProspects";

type View = "table" | "pipeline" | "campaign";

const CRM = () => {
  const [view, setView] = useState<View>("table");
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

  const viewTabs = [
    { key: "table" as View, icon: Table2, label: "Table" },
    { key: "pipeline" as View, icon: LayoutGrid, label: "Pipeline" },
    { key: "campaign" as View, icon: BarChart3, label: "Campaign" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* View Tabs + Filter Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showFilters ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
          >
            <Filter className="w-3.5 h-3.5" />Filters
          </button>
        </div>

        {/* Stats Bar */}
        {view === "campaign" ? (
          <CampaignStats prospects={displayProspects} />
        ) : (
          <CRMStats prospects={displayProspects} />
        )}

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

        {/* Views */}
        {view === "table" && (
          <ProspectTable
            prospects={displayProspects}
            isLoading={isLoading || isSearching}
            onRefetch={refetch}
            onOutreach={(selected) => setOutreachProspects(selected)}
          />
        )}
        {view === "pipeline" && (
          <PipelineView
            prospects={displayProspects}
            onRefetch={refetch}
          />
        )}
        {view === "campaign" && (
          <ProspectTable
            prospects={displayProspects}
            isLoading={isLoading || isSearching}
            onRefetch={refetch}
            onOutreach={(selected) => setOutreachProspects(selected)}
          />
        )}

        {/* Outreach Dialog */}
        {outreachProspects && outreachProspects.length > 0 && (
          <OutreachDialog
            prospects={outreachProspects}
            onClose={() => setOutreachProspects(null)}
            onSent={() => { setOutreachProspects(null); refetch(); }}
          />
        )}
      </div>
    </div>
  );
};

export default CRM;
