import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import ComplianceIllustration from "./illustrations/ComplianceIllustration";

const features = [
  "Automatic DNC detection — If a lead says \"stop calling,\" the AI complies instantly and adds them to your Do-Not-Call list",
  "Recording disclosures — Configurable recording announcement at the start of every call",
  "Business hours enforcement — Calls are only placed during permitted hours in the lead's local timezone",
  "Consent management — Optional verbal consent collection before proceeding",
  "HIPAA-ready infrastructure — Your call data is protected with enterprise-grade security",
];

export default function ComplianceSection() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-landing-green mb-3">
            Built for Compliance
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-landing-text-dark mb-6">
            TCPA Compliant. HIPAA Ready. DNC Respected.
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

        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ComplianceIllustration />
        </motion.div>
      </div>
    </section>
  );
}
