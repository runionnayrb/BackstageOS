import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Users, 
  Calendar, 
  Clapperboard, 
  Settings, 
  Shield,
  Play,
  CheckCircle,
  Clock,
  Zap,
  Globe,
  Smartphone,
  Download,
  Upload,
  BarChart3,
  Lock,
  ArrowRight,
  Star
} from "lucide-react";

export default function MainLanding() {
  const handleGetStarted = () => {
    window.location.href = 'https://beta.backstageos.com';
  };

  const handleJoinWaitlist = () => {
    window.location.href = 'https://join.backstageos.com';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clapperboard className="h-8 w-8 text-primary" />
              <h1 className="text-2xl text-gray-900">
                <span style={{ fontWeight: 400 }}>Backstage</span>
                <span style={{ fontWeight: 700 }}>OS</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleJoinWaitlist}>
                Join Waitlist
              </Button>
              <Button onClick={handleGetStarted}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mb-6">
              <Star className="h-4 w-4 mr-2" />
              Revolutionizing Stage Management
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            The Complete Platform for
            <span className="text-primary block">Professional Stage Managers</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Streamline your entire production workflow with our comprehensive suite of tools designed specifically for theater professionals. From rehearsal reports to scheduling, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-3">
              Start Your Production <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleJoinWaitlist} className="text-lg px-8 py-3">
              Join the Waitlist
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Professional Productions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built by stage managers, for stage managers. Every feature is designed to solve real production challenges.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: FileText,
                title: "Smart Reports",
                description: "Rehearsal, tech, and performance reports with custom templates and auto-save."
              },
              {
                icon: Calendar,
                title: "Visual Scheduling",
                description: "Drag-and-drop calendar with availability tracking and conflict detection."
              },
              {
                icon: Clapperboard,
                title: "Script Management",
                description: "Collaborative script editing with version control and cue tracking."
              },
              {
                icon: Users,
                title: "Contact Management",
                description: "Comprehensive cast and crew databases with emergency contacts."
              },
              {
                icon: Settings,
                title: "Props & Costumes",
                description: "Track props, costumes, and quick-changes with status updates."
              },
              {
                icon: Shield,
                title: "Team Collaboration",
                description: "Secure sharing with role-based permissions and real-time updates."
              },
              {
                icon: Smartphone,
                title: "Mobile Ready",
                description: "Access your production data from anywhere, backstage or front of house."
              },
              {
                icon: Globe,
                title: "Cloud Powered",
                description: "Your data is always backed up and accessible from any device."
              }
            ].map((feature, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Productions?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join professional stage managers worldwide who are already using BackstageOS to streamline their productions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-3">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleJoinWaitlist} className="text-lg px-8 py-3">
              Join Waitlist for Early Access
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Clapperboard className="h-6 w-6 text-primary" />
            <span className="text-xl text-white">
              <span style={{ fontWeight: 400 }}>Backstage</span>
              <span style={{ fontWeight: 700 }}>OS</span>
            </span>
          </div>
          <p className="text-gray-400 mb-4">
            Revolutionizing stage management for the modern theater professional.
          </p>
          <p className="text-sm text-gray-500">
            © 2025 BackstageOS. Built for the theater community.
          </p>
        </div>
      </footer>
    </div>
  );
}