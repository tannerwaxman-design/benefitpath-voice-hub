import logo from "@/assets/benefit_path_icon.svg";

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="BenefitPath" className="h-7 w-auto" />
            <span className="font-semibold text-sm text-landing-text-dark">
              BenefitPath
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-landing-text-muted">
            <a href="#" className="hover:text-landing-text-dark transition-colors">
              Cookies
            </a>
            <a href="#" className="hover:text-landing-text-dark transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-landing-text-dark transition-colors">
              Terms &amp; Conditions
            </a>
          </div>
        </div>
        <p className="text-center text-xs text-landing-text-muted leading-relaxed max-w-3xl mx-auto">
          © {new Date().getFullYear()} Benefit Path | All Rights Reserved. We do
          not offer every plan available in your area. Currently we represent 30
          organizations which offer 1,000 products in your area. Please contact
          Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance
          Program (SHIP) to get information on all of your options. Not connected
          with or endorsed by the U.S. government or the federal Medicare
          program.
        </p>
      </div>
    </footer>
  );
}
