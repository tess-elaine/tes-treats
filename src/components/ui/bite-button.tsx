import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "scalloped-bite-sm rounded-lg bg-primary text-on-primary hover:bg-primary-container shadow-chocolate",
  secondary:
    "scalloped-bite-sm rounded-lg bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed",
  ghost:
    "rounded-lg text-primary hover:bg-surface-container",
};

const sizes: Record<Size, string> = {
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

const base =
  "inline-flex items-center justify-center gap-2 font-headline font-bold " +
  "transition-all duration-500 ease-cozy relative " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
  "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
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
  const { variant = "primary", size = "lg", className, children, ...rest } = props;
  const cls = cn(base, sizes[size], variants[variant], className);

  if ("href" in rest && rest.href) {
    const { href, ...linkRest } = rest as AsLink;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...(rest as AsButton)}>
      {children}
    </button>
  );
}
