export default function HeroIllustration() {
  const calls = [
    { name: "Margaret J.", status: "Connected", color: "bg-green-500", dur: "3:24" },
    { name: "Robert K.", status: "Voicemail", color: "bg-yellow-500", dur: "0:45" },
    { name: "Susan M.", status: "Connected", color: "bg-green-500", dur: "2:12" },
    { name: "James P.", status: "No Answer", color: "bg-gray-400", dur: "0:30" },
  ];

  return (
    <div className="w-full max-w-sm">
      {/* Phone frame */}
      <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-gray-100 px-5 py-2.5 flex items-center justify-between text-[10px] text-gray-500">
            <span className="font-medium">9:41</span>
            <div className="w-20 h-5 bg-gray-800 rounded-full" />
            <div className="flex gap-1 items-center">
              <div className="w-4 h-2.5 border border-gray-500 rounded-sm">
                <div className="w-2.5 h-full bg-green-500 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="bg-[#5046E5] px-5 py-3">
            <p className="text-white text-xs font-medium opacity-80">BenefitPath Voice AI</p>
            <p className="text-white text-sm font-bold">Active Campaign</p>
          </div>

          {/* Call active indicator */}
          <div className="px-5 py-4 bg-[#F0EFFF] text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-[#5046E5]">AI Agent Active</span>
            </div>
            <p className="text-[11px] text-gray-500">Calling Margaret Johnson...</p>
            {/* Sound wave */}
            <div className="flex items-center justify-center gap-[3px] mt-2">
              {[3, 5, 8, 12, 8, 5, 3, 5, 10, 7, 4, 6, 9, 5, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-[#5046E5] rounded-full animate-pulse"
                  style={{
                    height: `${h * 2}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "1.2s",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Call log rows */}
          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Recent Calls
            </p>
            {calls.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-xs font-medium text-gray-800 w-24">{c.name}</span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.color}`} />
                  <span className="text-[11px] text-gray-600">{c.status}</span>
                </span>
                <span className="text-[11px] text-gray-400">{c.dur}</span>
              </div>
            ))}
          </div>

          {/* Bottom stats */}
          <div className="bg-gray-50 px-5 py-3 grid grid-cols-3 gap-2 text-center border-t border-gray-100">
            <div>
              <p className="text-[#5046E5] font-bold text-lg">47</p>
              <p className="text-gray-400 text-[9px] uppercase">Calls</p>
            </div>
            <div>
              <p className="text-gray-800 font-bold text-lg">12</p>
              <p className="text-gray-400 text-[9px] uppercase">Connected</p>
            </div>
            <div>
              <p className="text-green-500 font-bold text-lg">5</p>
              <p className="text-gray-400 text-[9px] uppercase">Booked</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
