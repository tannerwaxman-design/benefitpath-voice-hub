import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/benefit_path_icon.svg";

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
        scrolled ? "shadow-md" : "border-b border-gray-100"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/welcome" className="flex items-center gap-2.5">
          <img src={logo} alt="BenefitPath" className="h-9 w-auto" />
          <span className="text-xl font-bold tracking-tight text-landing-text-dark">
            BenefitPath
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button
              variant="ghost"
              className="text-landing-text-muted hover:text-landing-text-dark font-medium"
            >
              Login
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-landing-green hover:bg-landing-green-hover text-landing-green-foreground font-semibold rounded-lg px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
