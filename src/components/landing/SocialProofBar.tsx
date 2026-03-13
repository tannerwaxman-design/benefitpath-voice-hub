import { motion } from "framer-motion";

export default function SocialProofBar() {
  return (
    <motion.section
      className="bg-landing-gray-bg py-6 border-y border-gray-200"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <p className="text-center text-landing-text-muted text-sm font-medium">
        Trusted by <span className="text-landing-text-dark font-semibold">500+</span> insurance agents nationwide
      </p>
    </motion.section>
  );
}
