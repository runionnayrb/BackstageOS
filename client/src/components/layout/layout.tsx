import EnhancedHeader from "../navigation/enhanced-header";
import MobileFooterNav from "../navigation/mobile-footer-nav";
import VersionFooter from "../version-footer";
import PageTransition from "../transitions/page-transition";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="bg-white flex flex-col min-h-screen">
      <EnhancedHeader />
      <main className="pb-16 md:pb-0">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <VersionFooter />
      <MobileFooterNav />
    </div>
  );
}
