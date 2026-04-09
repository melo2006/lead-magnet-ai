import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.tsx";
import Index from "./pages/Index.tsx";
import DemoSite from "./pages/DemoSite.tsx";
import CRM from "./pages/CRM.tsx";
import TryDemo from "./pages/TryDemo.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AppLayout = () => {
  const { pathname } = useLocation();
  const hideNavbar = pathname === "/try";

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/*" element={<CRM />} />
        <Route path="/landing" element={<Index />} />
        <Route path="/demo" element={<DemoSite />} />
        <Route path="/try" element={<TryDemo />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
