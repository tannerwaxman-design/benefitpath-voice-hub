import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  "5,000 call minutes per month",
  "Unlimited AI agents",
  "Unlimited campaigns",
  "Full call transcripts & recordings",
  "Real-time analytics dashboard",
  "DNC & compliance management",
  "Live call transfer to your phone",
  "CSV upload & CRM sync",
  "Priority support",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-white py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-landing-text-dark mb-3">
            Simple Pricing. No Surprises.
          </h2>
        </div>

        <motion.div
          className="max-w-md mx-auto bg-white rounded-2xl border-2 border-landing-green shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-8 md:p-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <p className="text-sm font-bold text-landing-green uppercase tracking-wider mb-2">
              Voice AI Pro
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-landing-text-dark">$99</span>
              <span className="text-landing-text-muted">/mo</span>
            </div>
            <p className="text-sm text-landing-text-muted mt-2">
              Add-on to your BenefitPath subscription
            </p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-landing-green shrink-0" />
                <span className="text-landing-text-dark text-sm">{f}</span>
              </li>
            ))}
          </ul>

          <Link to="/signup">
            <Button className="w-full bg-landing-green hover:bg-landing-green-hover text-landing-green-foreground font-bold text-base py-6 rounded-lg">
              Get Started
            </Button>
          </Link>

          <p className="text-center text-xs text-landing-text-muted mt-4">
            Already a BenefitPath member? Add Voice AI from your dashboard.
          </p>
          <p className="text-center text-xs text-landing-text-muted mt-2">
            Need more minutes? Enterprise plans available.{" "}
            <a href="#contact" className="text-landing-green hover:underline">Contact us</a>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
