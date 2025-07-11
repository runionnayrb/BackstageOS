import EnhancedHeader from "../navigation/enhanced-header";
import MobileBottomNav from "../navigation/mobile-bottom-nav";
import VersionFooter from "../version-footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EnhancedHeader />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <VersionFooter />
      <MobileBottomNav />
    </div>
  );
}
