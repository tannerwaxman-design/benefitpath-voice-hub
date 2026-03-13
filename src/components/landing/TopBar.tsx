import { Phone } from "lucide-react";

export default function TopBar() {
  return (
    <div className="bg-landing-navy-deep text-white text-xs py-2 text-center">
      <div className="flex items-center justify-center gap-4">
        <span className="flex items-center gap-1.5">
          <Phone className="h-3 w-3" />
          Call Now: (800) 555-0199
        </span>
        <span className="text-white/40">|</span>
        <span>TTY: 711</span>
      </div>
    </div>
  );
}
