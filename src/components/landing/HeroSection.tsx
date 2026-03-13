import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import HeroIllustration from "./illustrations/HeroIllustration";

export default function HeroSection() {
  return (
    <section className="bg-landing-navy text-white">
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left */}
        <motion.div
          className="flex-1 lg:max-w-[60%]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block bg-landing-green text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-6">
            New Add-On
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Your AI Agent.
            <br />
            Calling Your Leads.
            <br />
            Booking Your Appointments.
          </h1>

          <p className="text-lg md:text-xl text-gray-300 max-w-xl mb-8 leading-relaxed">
            BenefitPath Voice AI calls your prospects, handles objections, and
            schedules consultations — so you can focus on closing. Built for
            Medicare and benefits agents.
          </p>

          <Link to="/signup">
            <Button
              size="lg"
              className="bg-landing-green hover:bg-landing-green-hover text-landing-green-foreground font-bold text-base px-8 py-6 rounded-lg group"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>

          <p className="text-sm text-gray-400 mt-4">
            No credit card required. Cancel anytime.
          </p>
        </motion.div>

        {/* Right */}
        <motion.div
          className="flex-1 lg:max-w-[40%] w-full"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}
