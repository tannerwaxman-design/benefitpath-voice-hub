import { Link } from "react-router-dom";
import { Check, Zap, Star, Building2, Crown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    icon: Zap,
    tagline: "Perfect for solo agents testing the waters",
    features: [
      "1 AI agent",
      "Outbound calls only",
      "Basic call logs",
      "1 campaign at a time",
      "CSV contact upload",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "$79",
    icon: Star,
    popular: true,
    tagline: "The go-to plan for serious agents",
    features: [
      "Unlimited AI agents",
      "Outbound + inbound calls",
      "Full transcripts & recordings",
      "AI call summaries & sentiment",
      "Knowledge base",
      "Smart scheduling",
      "CRM & calendar tools",
      "Unlimited campaigns",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    price: "$199",
    icon: Building2,
    tagline: "Built for agencies that want every advantage",
    features: [
      "Everything in Professional",
      "Voice cloning",
      "AI call scoring",
      "AI objection trainer",
      "Multi-language (Spanish)",
      "Team management (up to 10)",
      "Call coaching & review",
      "Dedicated account manager",
      "Phone & video support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    icon: Crown,
    tagline: "For large operations with custom needs",
    features: [
      "Everything in Agency",
      "Unlimited team members",
      "Custom AI model training",
      "API access",
      "White-label option",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

const creditPackages = [
  { credits: "500", price: "$25", perCredit: "$0.18" },
  { credits: "1,000", price: "$45", perCredit: "$0.18" },
  { credits: "5,000", price: "$175", perCredit: "$0.18", best: true },
  { credits: "10,000", price: "$300", perCredit: "$0.18" },
];

export default function PricingSection() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Simple Pricing. Pay for What You Use.
          </h2>
          <p className="text-gray-600 text-[15px]">
            Pick a plan for the features. Buy credits when you need them.<br />
            No contracts. No hidden fees. <strong>Credits never expire.</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                p.popular ? "border-[#5046E5] shadow-lg ring-1 ring-[#5046E5]/20 relative" : "border-gray-200"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5046E5] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-2 mb-3">
                <p.icon className="h-5 w-5 text-[#5046E5]" />
                <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
              </div>
              <div className="mb-1">
                {p.price === "Custom" ? (
                  <span className="text-2xl font-bold text-gray-900">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-gray-900">{p.price}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 italic mb-4">{p.tagline}</p>
              <ul className="space-y-2 flex-1 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="text-[14px] text-gray-700 flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={p.name === "Enterprise" ? "#" : "/signup"}
                className={`block text-center font-semibold text-sm py-2.5 rounded-full transition-colors ${
                  p.popular
                    ? "bg-[#5046E5] hover:bg-[#4338CA] text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                }`}
              >
                {p.name === "Enterprise" ? "Contact Sales" : "Get Started"}
              </Link>
            </div>
          ))}
        </div>

        {/* Credits Section */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Credits purchased separately</h3>
          <p className="text-sm text-gray-500 mb-6">1 credit = 1 minute of calling. Buy as many as you need. Credits never expire.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {creditPackages.map(pkg => (
              <div key={pkg.credits} className={`rounded-xl border p-4 text-center ${pkg.best ? "border-[#5046E5] bg-[#5046E5]/5 ring-1 ring-[#5046E5]/20 relative" : "border-gray-200"}`}>
                {pkg.best && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#5046E5] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    BEST VALUE
                  </span>
                )}
                <p className="text-sm font-bold text-gray-900 mt-1">{pkg.credits} credits</p>
                <p className="text-xl font-extrabold text-gray-900">{pkg.price}</p>
                <p className="text-xs text-gray-400">{pkg.perCredit} each</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Auto-refill available so your campaigns never stop.</p>
        </div>
      </div>
    </section>
  );
}
