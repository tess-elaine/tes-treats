import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tilt?: "left" | "right" | "none";
};

export function IngredientChip({ className, tilt = "left", children, ...rest }: Props) {
  const tiltClass =
    tilt === "left" ? "chip-tilt-left" : tilt === "right" ? "chip-tilt-right" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed",
        "px-3 py-1 font-label uppercase tracking-[0.06em] text-[0.75rem]",
        tiltClass,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
