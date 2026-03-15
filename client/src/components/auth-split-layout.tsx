import { ReactNode } from "react";
import { Link } from "wouter";
import { 
  Clapperboard, 
  FileText, 
  Users, 
  Calendar, 
  Settings, 
  Shield 
} from "lucide-react";

interface AuthSplitLayoutProps {
  children: ReactNode;
}

const features = [
  { icon: Clapperboard, label: "Show centric organization" },
  { icon: Calendar, label: "Scheduling and call sheets" },
  { icon: FileText, label: "Professional reports and templates" },
  { icon: Users, label: "Team and cast management" },
  { icon: Settings, label: "Script and cue management" },
  { icon: Shield, label: "Secure collaboration" },
];

export default function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:hidden bg-gradient-to-br from-primary to-secondary p-6">
        <Link href="/" className="inline-block" data-testid="link-home-mobile">
          <h1 className="text-2xl text-white">
            <span className="font-normal">Backstage</span>
            <span className="font-bold">OS</span>
          </h1>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white order-first lg:order-last">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary p-12 flex-col justify-center">
        <div className="max-w-md mx-auto text-white space-y-8">
          <Link href="/" className="inline-block" data-testid="link-home-desktop">
            <h1 className="text-5xl mb-6">
              <span className="font-normal">Backstage</span>
              <span className="font-bold">OS</span>
            </h1>
          </Link>
          
          <p className="text-xl opacity-90 leading-relaxed">
            The complete stage management platform for professional stage managers
          </p>
          
          <div className="space-y-4 pt-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:hidden bg-gradient-to-br from-primary to-secondary p-6">
        <div className="text-white space-y-3">
          <p className="text-sm opacity-90">
            The complete stage management platform for professional stage managers
          </p>
          <div className="flex flex-wrap gap-2">
            {features.slice(0, 3).map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1">
                <Icon className="h-3 w-3" />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
