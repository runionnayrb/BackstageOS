import Header from "./header";
import VersionFooter from "../version-footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <VersionFooter />
    </div>
  );
}
