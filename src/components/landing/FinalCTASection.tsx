import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FinalCTASection() {
  return (
    <section className="bg-landing-navy text-white py-20 md:py-28">
      <motion.div
        className="max-w-3xl mx-auto px-6 text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
          Ready to Let AI Work Your Leads?
        </h2>
        <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto">
          Join hundreds of agents who are booking more appointments with less effort.
        </p>
        <Link to="/signup">
          <Button
            size="lg"
            className="bg-landing-green hover:bg-landing-green-hover text-landing-green-foreground font-bold text-base px-10 py-6 rounded-lg group"
          >
            Get Started Today
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
        <p className="text-sm text-gray-400 mt-6">
          Questions? Call us at (800) 555-0199
        </p>
      </motion.div>
    </section>
  );
}
