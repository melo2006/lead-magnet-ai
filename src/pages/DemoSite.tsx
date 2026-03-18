import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import type { DemoLeadData } from "@/components/landing/demo-results/demoResultsUtils";
import RedesignedWebsite from "@/components/landing/demo-results/RedesignedWebsite";

const DemoSite = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const leadData = location.state?.leadData as DemoLeadData | undefined;

  useEffect(() => {
    if (!leadData) {
      navigate("/", { replace: true });
    }
  }, [leadData, navigate]);

  if (!leadData) return null;

  return <RedesignedWebsite leadData={leadData} />;
};

export default DemoSite;
