import DashboardMockup from "./illustrations/DashboardMockup";

const benefits = [
  {
    bold: "AI calls your leads 24/7",
    rest: " – No more manual dialing. Your AI agent calls during peak hours, even when you're in appointments.",
  },
  {
    bold: "Full transcripts & recordings",
    rest: " – Read or listen to every conversation. Know exactly what was said on every call.",
  },
  {
    bold: "Smart retry logic",
    rest: " – If a lead doesn't answer, Voice AI automatically tries again at the optimal time.",
  },
  {
    bold: "Live transfer to your phone",
    rest: " – When a lead is ready to close, the AI transfers the call directly to you with a quick summary.",
  },
  {
    bold: "Real-time analytics",
    rest: " – See your connect rate, appointment rate, and call outcomes in a live dashboard.",
  },
];

export default function KeyBenefitsSection() {
  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
          Key Benefits for Agents
        </h2>

        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          {/* Left: Dashboard mockup */}
          <div className="flex-1 w-full">
            <DashboardMockup />
          </div>

          {/* Right: Benefit bullets */}
          <div className="flex-1">
            <ul className="space-y-5">
              {benefits.map((b) => (
                <li key={b.bold} className="text-[15px] leading-relaxed text-gray-700">
                  <strong className="text-gray-900">{b.bold}</strong>
                  {b.rest}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
