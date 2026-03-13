import { motion } from "framer-motion";
import { Bot, Upload, CalendarCheck } from "lucide-react";

const cards = [
  {
    icon: Bot,
    title: "Build Your AI Agent",
    desc: "Give your agent a name, a voice, and a personality. Set your greeting, objection responses, and call objective. Your AI agent sounds like a real person from your team.",
  },
  {
    icon: Upload,
    title: "Upload Your Leads",
    desc: "Upload a CSV of leads or sync from your CRM. Set your calling schedule, retry rules, and daily limits. Voice AI respects Do-Not-Call lists and business hours automatically.",
  },
  {
    icon: CalendarCheck,
    title: "Watch Appointments Roll In",
    desc: "Voice AI calls your leads, qualifies them, handles objections, and books appointments on your calendar. You get real-time transcripts, call recordings, and performance analytics.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5 },
  }),
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-landing-text-dark mb-3">
            How Voice AI Works
          </h2>
          <p className="text-landing-text-muted text-lg">
            Set it up once. Let AI handle the rest.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-8 text-center hover:shadow-lg transition-shadow"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              <div className="w-14 h-14 bg-landing-green/10 rounded-xl flex items-center justify-center mx-auto mb-5">
                <card.icon className="h-7 w-7 text-landing-green" />
              </div>
              <h3 className="text-xl font-semibold text-landing-text-dark mb-3">
                {card.title}
              </h3>
              <p className="text-landing-text-muted leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
