import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { env } from "@/lib/env";
import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "VerblLayer",
  description: "Make every business dashboard agent-callable.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = env.AUTH_MODE === "clerk" ? <ClerkProvider>{children}</ClerkProvider> : children;

  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${sans.variable} ${mono.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div id="main-content">{content}</div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
