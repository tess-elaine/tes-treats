import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The bitten-cookie mark already contains the "TES treats" wordmark inside
 * the cookie, so this component renders the SVG as the full lockup.
 *
 * Variants:
 *   - "dark"  — tan cookie on cream/light surfaces (the default for our site)
 *   - "light" — cream cookie on dark surfaces (for hero overlays, footer
 *     accent colors, primary-color blocks)
 */
type Props = {
  className?: string;
  variant?: "dark" | "light";
  size?: number;
};

export function Wordmark({ className, variant = "dark", size = 48 }: Props) {
  const src =
    variant === "dark"
      ? "/brand/tes-logo-dark.svg"
      : "/brand/tes-logo-light.svg";

  return (
    <Link
      href="/"
      aria-label="TES Treats — home"
      className={cn(
        "inline-flex items-center transition-opacity hover:opacity-90",
        className,
      )}
    >
      <Image
        src={src}
        alt="TES Treats"
        width={size}
        height={size}
        priority
        style={{ width: size, height: size }}
      />
    </Link>
  );
}
