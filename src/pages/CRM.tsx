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
import EngagementDashboard from "@/components/crm/EngagementDashboard";

const CRM = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CRMSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-12 flex items-center border-b border-border px-4 bg-background/95 backdrop-blur-sm">
            <SidebarTrigger className="mr-3" />
            <img src="/logo.png" alt="AI Hidden Leads" className="w-6 h-6 mr-1.5" />
            <span className="text-sm font-bold text-foreground">AI <span className="text-primary">Hidden</span> Leads</span>
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
              <Route path="engagement" element={<EngagementDashboard />} />
              <Route path="templates" element={<TemplatesView />} />
              <Route path="*" element={<CRMDashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CRM;
