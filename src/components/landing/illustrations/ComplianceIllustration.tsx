import { Shield, Check } from "lucide-react";

export default function ComplianceIllustration() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="bg-landing-gray-bg rounded-2xl p-8 border border-gray-200">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <Shield className="h-24 w-24 text-landing-green" strokeWidth={1} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="h-10 w-10 text-landing-green" strokeWidth={3} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {["TCPA Compliant", "HIPAA Ready", "DNC Respected", "Encrypted Data"].map((item) => (
            <div key={item} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
              <div className="w-5 h-5 bg-landing-green rounded-full flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
              <span className="text-sm font-medium text-landing-text-dark">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
