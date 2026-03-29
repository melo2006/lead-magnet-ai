import { Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import CRMDashboard from "@/components/crm/CRMDashboard";
import ProspectsView from "@/components/crm/ProspectsView";
import CampaignsView from "@/components/crm/CampaignsView";
import PipelinePageView from "@/components/crm/PipelinePageView";
import TemplatesView from "@/components/crm/TemplatesView";

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
              <Route path="campaigns" element={<CampaignsView />} />
              <Route path="pipeline" element={<PipelinePageView />} />
              <Route path="templates" element={<TemplatesView />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CRM;
