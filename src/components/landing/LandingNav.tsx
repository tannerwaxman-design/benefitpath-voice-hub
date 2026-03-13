import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/welcome" className="flex items-center gap-2">
          <img
            src="/benefit-path-logo.svg"
            alt="Benefit Path"
            className="h-10 w-auto"
          />
        </Link>
        <div className="flex items-center gap-5">
          <Link
            to="/login"
            className="text-[15px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-block bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold text-[15px] px-7 py-2.5 rounded-full transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
