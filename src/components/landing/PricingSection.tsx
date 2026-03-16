import { Link } from "react-router-dom";
import { Check, Zap, Star, Building2, Crown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$49",
    icon: Zap,
    tagline: "Best for solo agents getting started",
    features: [
      "1,000 credits included",
      "1 AI agent",
      "Outbound calls only",
      "Basic call logs",
      "CSV contact upload",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "$149",
    icon: Star,
    popular: true,
    tagline: "Best for active agents and small teams",
    features: [
      "5,000 credits included",
      "Unlimited AI agents",
      "Outbound + inbound calls",
      "Full transcripts & recordings",
      "AI call scoring",
      "Knowledge base",
      "CRM & calendar integrations",
      "Smart scheduling",
      "Priority email & chat support",
    ],
  },
  {
    name: "Agency",
    price: "$349",
    icon: Building2,
    tagline: "Best for agencies managing multiple agents",
    features: [
      "15,000 credits included",
      "Everything in Professional",
      "Voice cloning",
      "AI objection trainer",
      "Multi-language support",
      "Team management (up to 10)",
      "White-label reports",
      "Dedicated account manager",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    icon: Crown,
    tagline: "Contact us for a custom quote",
    features: [
      "Unlimited credits",
      "Everything in Agency",
      "Unlimited team members",
      "Custom AI model training",
      "API access",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

export default function PricingSection() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Ready to Start Booking More Appointments?
          </h2>
          <p className="text-gray-600 text-[15px]">
            Simple pricing. Powerful features. <strong>Made for Agents.</strong>
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
      </div>
    </section>
  );
}