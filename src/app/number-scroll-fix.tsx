"use client";

import { useEffect } from "react";

export function NumberScrollFix() {
  useEffect(() => {
    function handler(e: WheelEvent) {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === "number"
      ) {
        document.activeElement.blur();
      }
    }
    document.addEventListener("wheel", handler, { passive: true });
    return () => document.removeEventListener("wheel", handler);
  }, []);
  return null;
}
