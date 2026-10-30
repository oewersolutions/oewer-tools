"use client";

import { useEffect } from "react";

/**
 * Marks the page as interactive once its JavaScript has taken over. Browser tests wait for this before typing or
 * clicking, so they never act on a page that is still loading (slow machines, and Safari's engine on CI, expose it).
 */
export default function HydrationFlag() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return null;
}
