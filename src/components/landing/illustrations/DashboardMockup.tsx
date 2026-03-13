export default function DashboardMockup() {
  const calls = [
    { name: "Margaret J.", outcome: "Connected", sentiment: "Positive", duration: "3:24" },
    { name: "Robert K.", outcome: "Voicemail", sentiment: "—", duration: "0:45" },
    { name: "Susan M.", outcome: "Connected", sentiment: "Neutral", duration: "2:12" },
    { name: "James P.", outcome: "No Answer", sentiment: "—", duration: "0:30" },
    { name: "Linda W.", outcome: "Connected", sentiment: "Positive", duration: "4:01" },
  ];

  const sentimentColor: Record<string, string> = {
    Positive: "bg-landing-green/20 text-landing-green",
    Neutral: "bg-yellow-100 text-yellow-700",
    "—": "bg-gray-100 text-gray-400",
  };

  const outcomeColor: Record<string, string> = {
    Connected: "text-landing-green",
    Voicemail: "text-yellow-600",
    "No Answer": "text-gray-400",
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Browser bar */}
      <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-gray-400 text-center">
          app.benefitpath.com/calls
        </div>
      </div>

      {/* Call log */}
      <div className="p-4">
        <p className="text-xs font-semibold text-landing-text-dark mb-3">Recent Calls</p>
        <div className="space-y-2">
          {calls.map((c) => (
            <div key={c.name} className="flex items-center justify-between text-[11px] py-1.5 border-b border-gray-50 last:border-0">
              <span className="font-medium text-landing-text-dark w-24">{c.name}</span>
              <span className={`font-medium ${outcomeColor[c.outcome]}`}>{c.outcome}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sentimentColor[c.sentiment]}`}>
                {c.sentiment}
              </span>
              <span className="text-gray-400">{c.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
