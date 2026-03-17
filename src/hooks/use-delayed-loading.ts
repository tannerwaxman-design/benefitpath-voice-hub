import { useState, useEffect } from "react";

/**
 * Only show skeleton after a delay to prevent flash for fast loads.
 */
export function useDelayedLoading(isLoading: boolean, delay: number = 300) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return isLoading && showSkeleton;
}
