import { useState } from "react";
import { niches } from "@/data/nicheData";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import ServicesGrid from "@/components/landing/ServicesGrid";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import DemoDifferentiator from "@/components/landing/DemoDifferentiator";
import TestimonialSection from "@/components/landing/TestimonialSection";
import LeadCaptureSection from "@/components/landing/LeadCaptureSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const [selectedNiche, setSelectedNiche] = useState(niches[0]);

  const scrollToDemo = () => {
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection niche={selectedNiche} onGetDemo={scrollToDemo} />
      <StatsSection niche={selectedNiche} />
      <ServicesGrid />
      <HowItWorksSection />
      <BeforeAfterSection niche={selectedNiche} />
      <DemoDifferentiator />
      <TestimonialSection niche={selectedNiche} />
      <LeadCaptureSection selectedNiche={selectedNiche} />
      <Footer />
    </div>
  );
};

export default Index;
