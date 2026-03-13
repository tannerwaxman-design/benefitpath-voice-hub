import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import DashboardMockup from "./illustrations/DashboardMockup";

const features = [
  "Full call transcripts — Read every word of every conversation",
  "AI-generated summaries — Get the key takeaway in 2 sentences",
  "Sentiment analysis — See if the lead was positive, neutral, or frustrated",
  "Appointment detection — Automatically track when appointments are booked",
  "Call recordings — Listen back to any call anytime",
  "Live transfer — AI hands off to you when the lead is ready to close",
];

export default function DeepFeatureSection() {
  return (
    <section className="bg-landing-gray-bg py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <DashboardMockup />
        </motion.div>

        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-landing-green mb-3">
            Real-Time Intelligence
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-landing-text-dark mb-6">
            Know What's Happening on Every Call
          </h2>
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-landing-green shrink-0 mt-0.5" />
                <span className="text-landing-text-muted leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
