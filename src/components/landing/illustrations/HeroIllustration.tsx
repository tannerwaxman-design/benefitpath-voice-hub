export default function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Phone frame */}
      <div className="bg-gray-800 rounded-[2rem] p-3 shadow-2xl">
        <div className="bg-gray-900 rounded-[1.5rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-gray-800 px-5 py-2 flex items-center justify-between text-[10px] text-gray-400">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-landing-green rounded-sm" />
            </div>
          </div>

          {/* Call screen */}
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 bg-landing-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-10 h-10 bg-landing-green rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
            </div>

            <p className="text-white font-semibold text-lg mb-1">AI Agent Active</p>
            <p className="text-gray-400 text-sm mb-6">Calling Margaret Johnson...</p>

            {/* Sound waves */}
            <div className="flex items-center justify-center gap-1 mb-6">
              {[3, 5, 8, 12, 8, 5, 3, 5, 10, 7, 4, 6, 9, 5, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-landing-green rounded-full animate-pulse"
                  style={{
                    height: `${h * 3}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '1.2s',
                  }}
                />
              ))}
            </div>

            <p className="text-gray-500 text-xs">02:34 elapsed</p>
          </div>

          {/* Bottom stats */}
          <div className="bg-gray-800/50 px-5 py-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-landing-green font-bold text-lg">47</p>
              <p className="text-gray-500 text-[10px]">Calls Made</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg">12</p>
              <p className="text-gray-500 text-[10px]">Connected</p>
            </div>
            <div>
              <p className="text-landing-green font-bold text-lg">5</p>
              <p className="text-gray-500 text-[10px]">Booked</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
