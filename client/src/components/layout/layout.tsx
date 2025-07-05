import EnhancedHeader from "../navigation/enhanced-header";
import VersionFooter from "../version-footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <EnhancedHeader />
      <main className="flex-1">
        {children}
      </main>
      <VersionFooter />
    </div>
  );
}
