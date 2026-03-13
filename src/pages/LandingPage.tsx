import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import FeatureCardsSection from "@/components/landing/FeatureCardsSection";
import KeyBenefitsSection from "@/components/landing/KeyBenefitsSection";
import PricingSection from "@/components/landing/PricingSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main>
        <HeroSection />
        <FeatureCardsSection />
        <KeyBenefitsSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
