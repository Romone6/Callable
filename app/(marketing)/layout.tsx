import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-main min-h-screen">
      <MarketingNavbar />
      {children}
      <MarketingFooter />
    </div>
  );
}

