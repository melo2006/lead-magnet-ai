import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import DemoSite from "./pages/DemoSite.tsx";
import CRM from "./pages/CRM.tsx";
import TryDemo from "./pages/TryDemo.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/marketing" element={<Index />} />
          <Route path="/demo-site" element={<DemoSite />} />
          <Route path="/demo" element={<TryDemo />} />
          <Route path="/*" element={<CRM />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
