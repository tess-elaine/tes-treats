import type { Metadata } from "next";
import { Epilogue, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NumberScrollFix } from "./number-scroll-fix";

const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TES Treats — Every treat baked with you in mind.",
    template: "%s · TES Treats",
  },
  description:
    "Buffalo's sweetest secret. Homemade cookies, seasonal treat drops, and custom orders from Tess — baked fresh and made with love.",
};

/**
 * Root layout. Just html/body and font CSS variables. The actual chrome
 * (header/footer or admin sidebar) lives in the route-group layouts:
 *   - src/app/(site)/layout.tsx — public marketing/customer site
 *   - src/app/admin/layout.tsx — admin sidebar
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${epilogue.variable} ${newsreader.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-on-surface" suppressHydrationWarning>
        <NumberScrollFix />
        {children}
      </body>
    </html>
  );
}
