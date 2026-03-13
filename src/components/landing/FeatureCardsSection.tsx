const cards = [
  {
    icon: "/feature-icon-1.png",
    title: "AI Outbound Calls",
    description:
      "Your AI agent calls your leads, introduces your services, handles objections, and books appointments on your calendar — all while you focus on closing.",
  },
  {
    icon: "/feature-icon-2.png",
    title: "Time Saving",
    description:
      "Stop spending 3+ hours a day manually dialing. Upload your leads, hit launch, and let Voice AI call your entire list while you work on what matters.",
  },
  {
    icon: "/feature-icon-3.png",
    title: "Compliant",
    description:
      "Every call respects DNC lists, business hours, and recording disclosures. Built with TCPA compliance and HIPAA-ready security, so you can focus on your clients with confidence.",
  },
];

export default function FeatureCardsSection() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card) => (
            <div
              key={card.title}
              className="text-center px-4"
            >
              <img
                src={card.icon}
                alt={card.title}
                className="w-20 h-20 mx-auto mb-5 object-contain"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {card.title}
              </h3>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
