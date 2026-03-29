import { useState } from "react";
import { niches } from "@/data/nicheData";
import NicheSelector from "@/components/landing/NicheSelector";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import CompetitorBanner from "@/components/landing/CompetitorBanner";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialSection from "@/components/landing/TestimonialSection";
import LeadCaptureSection from "@/components/landing/LeadCaptureSection";
import Footer from "@/components/landing/Footer";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";

const Index = () => {
  const [selectedNiche, setSelectedNiche] = useState(niches[0]);

  const scrollToDemo = () => {
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection niche={selectedNiche} onGetDemo={scrollToDemo} />
      <HeroSection niche={selectedNiche} onGetDemo={scrollToDemo} />
      <StatsSection niche={selectedNiche} />
      <BeforeAfterSection niche={selectedNiche} />
      <CompetitorBanner />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialSection niche={selectedNiche} />
      <LeadCaptureSection selectedNiche={selectedNiche} />
      <Footer />
    </div>
  );
};

export default Index;
