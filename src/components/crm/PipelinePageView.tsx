import PipelineView from "@/components/crm/PipelineView";
import { DEFAULT_FILTERS } from "@/components/crm/CRMFilters";
import { useProspects } from "@/hooks/useProspects";

const PipelinePageView = () => {
  const { prospects, refetch } = useProspects(DEFAULT_FILTERS);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Drag and drop prospects through your sales pipeline</p>
      </div>
      <PipelineView prospects={prospects} onRefetch={refetch} />
    </div>
  );
};

export default PipelinePageView;
