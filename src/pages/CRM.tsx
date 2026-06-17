import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import CRMDashboard from "@/components/crm/CRMDashboard";
import FollowUpIntelligence from "@/components/crm/FollowUpIntelligence";
import ProspectsView from "@/components/crm/ProspectsView";
import IntentLeadsView from "@/components/crm/IntentLeadsView";
import CampaignsView from "@/components/crm/CampaignsView";
import CampaignDetailView from "@/components/crm/CampaignDetailView";
import PipelinePageView from "@/components/crm/PipelinePageView";
import TemplatesView from "@/components/crm/TemplatesView";
import CallHistoryView from "@/components/crm/CallHistoryView";
import DemoSessionsView from "@/components/crm/DemoSessionsView";
import ImportedListsView from "@/components/crm/ImportedListsView";
import ImportedListDetailView from "@/components/crm/ImportedListDetailView";
import EngagementDashboard from "@/components/crm/EngagementDashboard";
import SMSDashboard from "@/components/crm/SMSDashboard";
import AdHijack from "@/pages/AdHijack";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error("Admin sign-in failed", { description: error.message });
      return;
    }

    toast.success("Signed in");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="AI Hidden Leads" className="h-10 w-10" />
            <span className="text-base font-extrabold tracking-tight text-foreground">
              AI <span className="text-primary">Hidden</span> Leads
            </span>
          </div>
          <CardTitle className="text-lg">Admin sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="email"
              autoComplete="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to view history"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const CRM = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading admin...</div>;
  }

  if (!session) {
    return <AdminLogin />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CRMSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 flex items-center border-b border-border px-4 bg-background/95 backdrop-blur-sm">
            <SidebarTrigger className="mr-3" />
            <img src="/logo.png" alt="AI Hidden Leads" className="w-9 h-9 mr-2" />
            <span className="text-lg font-extrabold text-foreground tracking-tight">AI <span className="text-primary">Hidden</span> Leads</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 text-xs"
              onClick={() => supabase.auth.signOut()}
            >
              Sign out
            </Button>
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
              <Route path="sessions" element={<DemoSessionsView />} />
              <Route path="imported" element={<ImportedListsView />} />
              <Route path="imported/:id" element={<ImportedListDetailView />} />
              <Route path="engagement" element={<EngagementDashboard />} />
              <Route path="sms" element={<SMSDashboard />} />
              <Route path="follow-up" element={<FollowUpIntelligence />} />
              <Route path="templates" element={<TemplatesView />} />
              <Route path="ad-hijack" element={<AdHijack />} />
              <Route path="*" element={<CRMDashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CRM;
