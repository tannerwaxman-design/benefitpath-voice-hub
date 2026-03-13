import TopBar from "@/components/landing/TopBar";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofBar from "@/components/landing/SocialProofBar";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DeepFeatureSection from "@/components/landing/DeepFeatureSection";
import ComplianceSection from "@/components/landing/ComplianceSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofBar />
        <HowItWorksSection />
        <DeepFeatureSection />
        <ComplianceSection />
        <ComparisonSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
