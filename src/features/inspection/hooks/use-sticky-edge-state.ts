"use client";

import { useEffect, useRef, useState } from "react";

/** Reports whether a sticky element is currently held against the viewport edge. */
export function useStickyEdgeState(enabled: boolean) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const updateState = () => {
      const element = elementRef.current;
      if (!element) return;

      const { bottom, top } = element.getBoundingClientRect();
      const nextIsStuck =
        bottom >= window.innerHeight - 1 && top < window.innerHeight;

      setIsStuck((current) =>
        current === nextIsStuck ? current : nextIsStuck,
      );
    };

    const frame = window.requestAnimationFrame(updateState);
    window.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [enabled]);

  return { elementRef, isStuck: enabled && isStuck };
}
