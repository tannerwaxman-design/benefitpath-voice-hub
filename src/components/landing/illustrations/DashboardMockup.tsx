export default function DashboardMockup() {
  const calls = [
    { name: "Margaret J.", outcome: "Connected", sentiment: "Positive", duration: "3:24", dotColor: "bg-green-500" },
    { name: "Robert K.", outcome: "Voicemail", sentiment: "—", duration: "0:45", dotColor: "bg-yellow-500" },
    { name: "Susan M.", outcome: "Connected", sentiment: "Neutral", duration: "2:12", dotColor: "bg-green-500" },
    { name: "James P.", outcome: "No Answer", sentiment: "—", duration: "0:30", dotColor: "bg-red-400" },
    { name: "Linda W.", outcome: "Connected", sentiment: "Positive", duration: "4:01", dotColor: "bg-green-500" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Browser chrome */}
      <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded px-3 py-1 text-[10px] text-gray-400 text-center">
          app.benefitpath.com/calls
        </div>
      </div>

      <div className="flex">
        {/* Mini sidebar */}
        <div className="hidden md:flex flex-col w-14 bg-[#1a1a2e] py-4 items-center gap-4">
          <div className="w-6 h-6 rounded bg-[#5046E5] opacity-80" />
          <div className="w-5 h-0.5 bg-gray-600 rounded" />
          <div className="w-5 h-0.5 bg-gray-600 rounded" />
          <div className="w-5 h-0.5 bg-gray-700 rounded" />
          <div className="w-5 h-0.5 bg-gray-700 rounded" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <p className="text-xs font-semibold text-gray-800 mb-3">Recent Calls</p>
          <div className="space-y-0">
            {calls.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between text-[11px] py-2 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium text-gray-800 w-24">{c.name}</span>
                <span className="flex items-center gap-1.5 w-24">
                  <span className={`w-2 h-2 rounded-full ${c.dotColor}`} />
                  <span className="text-gray-600">{c.outcome}</span>
                </span>
                <span className="text-gray-400 w-10 text-right">{c.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
