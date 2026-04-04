import { Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import CRMDashboard from "@/components/crm/CRMDashboard";
import ProspectsView from "@/components/crm/ProspectsView";
import IntentLeadsView from "@/components/crm/IntentLeadsView";
import CampaignsView from "@/components/crm/CampaignsView";
import CampaignDetailView from "@/components/crm/CampaignDetailView";
import PipelinePageView from "@/components/crm/PipelinePageView";
import TemplatesView from "@/components/crm/TemplatesView";
import CallHistoryView from "@/components/crm/CallHistoryView";
import ImportedListsView from "@/components/crm/ImportedListsView";
import ImportedListDetailView from "@/components/crm/ImportedListDetailView";

const CRM = () => {
  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-56px)] flex w-full">
        <CRMSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 bg-background/50 backdrop-blur-sm">
            <SidebarTrigger className="mr-3" />
            <span className="text-xs text-muted-foreground">LeadEngine CRM</span>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <Routes>
              <Route index element={<CRMDashboard />} />
              <Route path="prospects" element={<ProspectsView />} />
              <Route path="intent-leads" element={<IntentLeadsView />} />
              <Route path="campaigns" element={<CampaignsView />} />
              <Route path="campaigns/:id" element={<CampaignDetailView />} />
              <Route path="pipeline" element={<PipelinePageView />} />
              <Route path="calls" element={<CallHistoryView />} />
              <Route path="imported" element={<ImportedListsView />} />
              <Route path="imported/:id" element={<ImportedListDetailView />} />
              <Route path="templates" element={<TemplatesView />} />
              <Route path="*" element={<CRMDashboard />} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CRM;
