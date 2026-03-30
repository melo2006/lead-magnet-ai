import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "./components/Navbar.tsx";
import Index from "./pages/Index.tsx";
import DemoSite from "./pages/DemoSite.tsx";
import CRM from "./pages/CRM.tsx";
import NotFound from "./pages/NotFound.tsx";

// Landing page is now at /landing, CRM is the homepage

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/*" element={<CRM />} />
          <Route path="/landing" element={<Index />} />
          <Route path="/demo" element={<DemoSite />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
