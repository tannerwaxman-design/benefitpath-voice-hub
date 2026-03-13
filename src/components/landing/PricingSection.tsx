import { Link } from "react-router-dom";

const features = [
  "5,000 outbound call minutes per month",
  "Unlimited AI agents & campaigns",
  "Full call transcripts & recordings",
  "Real-time analytics dashboard",
  "DNC & TCPA compliance built in",
  "Live call transfer to your phone",
  "CSV upload & CRM sync",
  "Priority support",
];

export default function PricingSection() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Ready to Start Booking More Appointments?
        </h2>

        <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8">
          Add Voice AI For Just $99/mo.
        </h3>

        <ul className="text-left max-w-md mx-auto space-y-2.5 mb-8">
          {features.map((f) => (
            <li key={f} className="text-[15px] text-gray-700 flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>

        <p className="text-gray-600 text-[15px] font-medium mb-8">
          Simple. Powerful. <strong>Made for Agents.</strong>
        </p>

        <Link
          to="/signup"
          className="inline-block bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold text-base px-8 py-3 rounded-full transition-colors"
        >
          Get Started &gt;
        </Link>
      </div>
    </section>
  );
}
