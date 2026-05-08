import * as React from "react";
import { cn } from "@/lib/cn";

export type BitePosition = "tr" | "tl" | "br" | "bl" | "none";

const BITE_CLASS: Record<BitePosition, string> = {
  tr: "rounded-lg",
  tl: "rounded-lg",
  br: "rounded-lg",
  bl: "rounded-lg",
  none: "rounded-lg",
};

type Props = React.HTMLAttributes<HTMLDivElement> & {
  bite?: BitePosition;
};

export function NibbleCard({
  className,
  children,
  bite = "tr",
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        BITE_CLASS[bite],
        "bg-surface-container-lowest shadow-chocolate",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
