import Header from "./header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
