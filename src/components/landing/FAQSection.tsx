import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Does Voice AI really sound like a real person?",
    a: "Yes. Voice AI uses advanced text-to-speech technology with natural-sounding voices. You can choose from multiple voice options, adjust speaking speed, and even enable natural filler words (\"um,\" \"let me think...\") to make conversations feel authentic.",
  },
  {
    q: "Will my leads know they're talking to an AI?",
    a: "Voice AI is designed to sound natural and professional. However, if a lead directly asks, the AI is configured to be transparent. You have full control over how your agent responds to these questions.",
  },
  {
    q: "Can the AI transfer the call to me?",
    a: "Absolutely. You set the rules for when the AI should transfer — when a lead is ready to close, requests a human, or gets frustrated. The AI introduces the caller to you with a quick summary of the conversation.",
  },
  {
    q: "What happens if someone says \"stop calling me\"?",
    a: "The AI immediately complies, apologizes, confirms the removal, and ends the call. Their number is automatically added to your Do-Not-Call list and they will never be called again.",
  },
  {
    q: "Can I use my existing phone number?",
    a: "Yes. You can use a dedicated number provisioned through BenefitPath, or configure your existing business number as the caller ID.",
  },
  {
    q: "How many calls can it make per day?",
    a: "You set the limits. Most agents run campaigns of 100-500 calls per day with 3-5 concurrent calls. You control the pacing, schedule, and daily caps.",
  },
  {
    q: "Is this HIPAA compliant?",
    a: "BenefitPath Voice AI is built on HIPAA-ready infrastructure. Call recordings are encrypted, access is restricted, and you maintain full control over data retention.",
  },
  {
    q: "Do I need to be technical to set this up?",
    a: "Not at all. The Agent Builder walks you through every step — pick a voice, write a greeting, set your objective, and you're live. No coding required.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="bg-landing-gray-bg py-20 md:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-landing-text-dark">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left text-landing-text-dark font-semibold hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-landing-text-muted leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
