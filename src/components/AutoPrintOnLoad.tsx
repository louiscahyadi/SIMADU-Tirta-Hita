"use client";

import { useEffect } from "react";

export default function AutoPrintOnLoad() {
  useEffect(() => {
    // slight delay to ensure layout is ready
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
