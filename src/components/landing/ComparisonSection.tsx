import { motion } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";

const without = [
  "Spend 3+ hours per day manually dialing",
  "Leave 50+ voicemails with no follow-up",
  "Forget to call back leads who said \"try me next week\"",
  "Lose track of who you've called and what they said",
  "Miss prime calling hours because you're in appointments",
];

const withAI = [
  "AI calls your entire lead list while you sleep",
  "Every voicemail gets a professional follow-up automatically",
  "Smart retry logic calls back at the perfect time",
  "Full transcript and summary for every single call",
  "Calls happen during peak connect hours — even when you're busy",
];

export default function ComparisonSection() {
  return (
    <section className="bg-landing-gray-bg py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-landing-text-dark mb-3">
            Stop Cold Calling. Start Smart Calling.
          </h2>
        </div>

        <motion.div
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Without */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-8">
            <p className="text-sm font-bold text-landing-text-muted uppercase tracking-wider mb-6">
              Without Voice AI
            </p>
            <ul className="space-y-4">
              {without.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-400">
                  <X className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With */}
          <div className="bg-white rounded-xl border-2 border-landing-green shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-8">
            <p className="text-sm font-bold text-landing-green uppercase tracking-wider mb-6">
              With Voice AI
            </p>
            <ul className="space-y-4">
              {withAI.map((item) => (
                <li key={item} className="flex items-start gap-3 text-landing-text-dark">
                  <CheckCircle2 className="h-5 w-5 text-landing-green shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
