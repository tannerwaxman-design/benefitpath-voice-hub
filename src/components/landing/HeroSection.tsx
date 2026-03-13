import { Link } from "react-router-dom";
import HeroIllustration from "./illustrations/HeroIllustration";

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #1a1a2e 40%, #16213e 60%, #2ecc71 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10 md:gap-16">
        {/* Left content */}
        <div className="flex-1 text-white">
          <h2 className="text-lg md:text-xl font-bold mb-2 opacity-90">
            Built For Medicare Agents
          </h2>
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.1] mb-3">
            Book More
            <br />
            Appointments
          </h1>
          <p className="text-xl md:text-2xl font-medium mb-8 opacity-90">
            With Your Own AI Calling Agent.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold text-base px-8 py-3 rounded-full transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Right mockup */}
        <div className="flex-1 flex justify-center md:justify-end">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}
