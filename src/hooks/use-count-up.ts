import { useState, useEffect } from "react";

export function useCountUp(target: number, duration: number = 400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return value;
}
