import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container shadow-chocolate",
  secondary:
    "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed",
  ghost:
    "text-primary hover:bg-surface-container",
};

const sizes: Record<Size, string> = {
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

const base =
  "inline-flex items-center justify-center gap-2 font-headline font-bold " +
  "rounded-lg relative btn-bitten " +
  "transition-all duration-500 ease-cozy " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
  "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  /** Set to the CSS color of whatever surface sits behind this button.
   *  Defaults to var(--color-surface). Override when placing the button
   *  on a surface-container, white card, etc. */
  biteColor?: string;
};

type AsLink = CommonProps & { href: string } & Omit<
  React.ComponentProps<typeof Link>,
  "href" | "className" | "children"
>;
type AsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

export function BiteButton(props: AsLink | AsButton) {
  const { variant = "primary", size = "lg", className, children, biteColor, ...rest } = props;
  const cls = cn(base, sizes[size], variants[variant], className);

  /* Ghost buttons have no visible background, so bite overlays don't apply. */
  const showBites = variant !== "ghost";
  const bs = size === "md" ? "-sm" : ""; /* bite-size suffix */

  /* Crumbs are cookie bits from the button itself — they should match the
     button's background color, not the page background. */
  /* Crumbs are cookie bits from the button — match the button bg.
     For primary: dark chocolate + medium chocolate.
     For secondary: medium tan + light tan (darker first so they show on any bg). */
  const crumbColors: Record<Variant, { color: string; alt: string }> = {
    primary:   { color: "var(--color-primary)",           alt: "var(--color-primary-container)" },
    secondary: { color: "var(--color-secondary)",          alt: "var(--color-secondary-container)" },
    ghost:     { color: "var(--color-primary)",           alt: "var(--color-secondary)" },
  };
  const { color: crumbColor, alt: crumbAlt } = crumbColors[variant];

  const biteStyle = {
    ...(biteColor ? { "--bite-bg": biteColor } : {}),
    "--crumb-color": crumbColor,
    "--crumb-alt": crumbAlt,
  } as React.CSSProperties;

  const inner = (
    <>
      {showBites && (
        <>
          <span className={`btn-bite btn-bite-1${bs}`} aria-hidden />
          <span className={`btn-bite btn-bite-2${bs}`} aria-hidden />
          <span className={`btn-bite btn-bite-3${bs}`} aria-hidden />
          <span className="btn-crumb btn-crumb-1" aria-hidden />
          <span className="btn-crumb btn-crumb-2" aria-hidden />
          <span className="btn-crumb btn-crumb-3" aria-hidden />
          <span className="btn-crumb btn-crumb-4" aria-hidden />
          <span className="btn-crumb btn-crumb-5" aria-hidden />
        </>
      )}
      <span className="relative z-10">{children}</span>
    </>
  );

  if ("href" in rest && rest.href) {
    const { href, ...linkRest } = rest as AsLink;
    return (
      <Link href={href} className={cls} style={biteStyle} {...linkRest}>
        {inner}
      </Link>
    );
  }
  const { style: buttonStyle, ...buttonRest } = rest as AsButton;
  return (
    <button
      className={cls}
      style={{ ...biteStyle, ...buttonStyle }}
      {...buttonRest}
    >
      {inner}
    </button>
  );
}
