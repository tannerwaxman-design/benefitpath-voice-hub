export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <img src="/benefit-path-logo.svg" alt="Benefit Path" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-700 transition-colors">
              Cookies
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Terms &amp; Conditions
            </a>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 leading-relaxed max-w-4xl mx-auto mb-3">
          © {new Date().getFullYear()} Benefit Path | All Rights Reserved
        </p>
        <p className="text-center text-[11px] text-gray-400 leading-relaxed max-w-4xl mx-auto">
          We do not offer every plan available in your area. Currently we
          represent 30 organizations which offer 1,000 products in your area.
          Please contact Medicare.gov, 1-800-MEDICARE, or your local State
          Health Insurance Program (SHIP) to get information on all of your
          options. Not connected with or endorsed by the U.S. government or the
          federal Medicare program.
        </p>
      </div>
    </footer>
  );
}
