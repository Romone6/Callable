import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], display: "swap", weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Callable",
  description: "An open-source command layer for business software.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${sans.variable} ${mono.variable}`}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div id="main-content">{children}</div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
