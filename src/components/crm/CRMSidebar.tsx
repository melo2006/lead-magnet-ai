import {
  LayoutDashboard, Search, Megaphone, LayoutGrid, FileText, Radar, PhoneIncoming, FolderInput, Monitor, Play
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const crmItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Prospects", url: "/prospects", icon: Search },
  { title: "Intent Leads", url: "/intent-leads", icon: Radar },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Pipeline", url: "/pipeline", icon: LayoutGrid },
  { title: "Call History", url: "/calls", icon: PhoneIncoming },
  { title: "Imported Lists", url: "/imported", icon: FolderInput },
  { title: "Templates", url: "/templates", icon: FileText },
];

const pageItems = [
  { title: "Marketing Page", url: "/marketing", icon: Monitor },
  { title: "Demo Page", url: "/demo", icon: Play },
];

export function CRMSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        {/* Logo area */}
        <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-border ${collapsed ? "justify-center px-2" : ""}`}>
          <img src="/logo.png" alt="AI Hidden Leads" className={collapsed ? "w-9 h-9" : "w-10 h-10"} />
          {!collapsed && (
            <span className="text-base font-extrabold tracking-tight text-foreground">
              AI <span className="text-primary">Hidden</span> Leads
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {!collapsed && "CRM"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {!collapsed && "Pages"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pageItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Connected APIs status */}
        {!collapsed && (
          <div className="mt-auto px-4 py-4 border-t border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Connected APIs</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[11px] text-foreground">Firecrawl</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[11px] text-foreground">Google Places</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[11px] text-foreground">Email (Resend)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[11px] text-foreground">SMS (Twilio)</span>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
