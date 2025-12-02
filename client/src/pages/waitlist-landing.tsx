import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSEO } from "@/hooks/useSEO";
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
  Star,
  Sparkles
} from "lucide-react";

export default function WaitlistLanding() {
  // Initialize SEO for the landing page
  useSEO();
  
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    experience: "",
    howHeard: "",
    additionalInfo: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.experience) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields (email, name, and experience level).",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join waitlist");
      }

      setWaitlistPosition(data.position);
      setIsSubmitted(true);
      toast({
        title: "Welcome to the waitlist!",
        description: `You're #${data.position} in line. We'll be in touch soon!`,
      });
    } catch (error: any) {
      console.error("Waitlist submission error:", error);
      console.error("Form data:", formData);
      
      if (error.message?.includes("already on waitlist")) {
        toast({
          title: "Already registered",
          description: "This email is already on our waitlist.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: `Error: ${error.message}. Please try again or contact support.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Clapperboard,
      title: "Show-Centric Organization",
      description: "Everything revolves around your show. Each production gets its own isolated workspace with dedicated settings, team permissions, and complete workflow separation.",
      comingSoon: false
    },
    {
      icon: FileText,
      title: "Custom Reports & Automatic Note Tracking",
      description: "Create custom reports for any phase of production. Automatically consolidate all rehearsal notes in one searchable location so you never have to hunt through reports to find that one critical note.",
      comingSoon: false
    },
    {
      icon: Users,
      title: "Complete Contact Management",
      description: "Import contacts, create downloadable contact sheets and face sheets, add emergency information, equity status, and allergies. Organize with custom groups and drag-and-drop reordering.",
      comingSoon: false
    },
    {
      icon: Calendar,
      title: "Visual Drag-and-Drop Calendar",
      description: "Monthly, weekly, and daily views with personalized schedules for each team member. Publish major and minor versions, manage timezones, customize event types with color coding. Save schedule templates to snapshot a week's events and instantly replicate them to other weeks.",
      comingSoon: false
    },
    {
      icon: Settings,
      title: "Script & Cue Management",
      description: "Built from the ground up for theatrical scripts with call script building, cue tracking, and collaborative editing designed specifically for stage managers.",
      comingSoon: true
    },
    {
      icon: Shield,
      title: "Seamless Team Collaboration",
      description: "Invite your entire stage management team to collaborate. Add unlimited viewers who can access everything without cluttering permissions. Integrate with Gmail or Outlook so all messages appear to come from your email.",
      comingSoon: false
    },
    {
      icon: FileText,
      title: "Props & Costume Management",
      description: "Maintain comprehensive props lists, costume lists, and quick-change information. Track status across scenes and characters with professional organization.",
      comingSoon: false
    },
    {
      icon: Zap,
      title: "Seamless Workflow Integration",
      description: "BackstageOS integrates so smoothly into your process that your team might not even realize you switched systems. Everything works the way stage managers already think.",
      comingSoon: false
    },
    {
      icon: BarChart3,
      title: "Universal Search",
      description: "Find anything instantly across your entire production. Search notes, contacts, reports, schedules, and scripts to locate information fast.",
      comingSoon: false
    }
  ];

  const workflow = [
    {
      icon: Upload,
      title: "Import Your Script",
      description: "Upload scripts in any format - PDF, Word, RTF, or plain text. Our system intelligently formats them for professional theater use."
    },
    {
      icon: Users,
      title: "Build Your Team",
      description: "Invite cast and crew members, assign roles, and manage contact information with comprehensive contact sheets."
    },
    {
      icon: Calendar,
      title: "Schedule Everything",
      description: "Create rehearsal schedules, tech schedules, and performance calendars with drag-and-drop simplicity."
    },
    {
      icon: FileText,
      title: "Generate Reports",
      description: "Create professional rehearsal, tech, and performance reports with custom templates and automated formatting."
    },
    {
      icon: BarChart3,
      title: "Track Progress",
      description: "Monitor props, costumes, cues, and production elements with comprehensive tracking systems."
    },
    {
      icon: Download,
      title: "Share & Export",
      description: "Generate PDFs, share secure links, and export data for seamless collaboration with your entire production team."
    }
  ];

  const technologies = [
    {
      icon: Zap,
      title: "Designed by Stage Managers, For Stage Managers",
      description: "Built with years of real stage management experience embedded into every feature. BackstageOS works the way you already think, not the other way around."
    },
    {
      icon: Globe,
      title: "Cloud-Native Architecture",
      description: "Automatic backups, universal access from anywhere, and enterprise-grade reliability. Your production data is always safe and accessible when you need it."
    },
    {
      icon: Smartphone,
      title: "Access Anywhere",
      description: "Work from the rehearsal studio, backstage, or the office. Responsive design means full functionality on any device or screen size."
    },
    {
      icon: Lock,
      title: "Professional Security & Email Integration",
      description: "Bank-level encryption and secure sharing. Integrate with Gmail or Outlook so communications feel native to your workflow, not like another tool."
    }
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4">
        <Card className="max-w-md mx-auto w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              You're on the list!
            </h2>
            <p className="text-gray-600 mb-4">
              You're #{waitlistPosition} in line for early access to <span style={{ fontWeight: 400 }}>Backstage</span><span style={{ fontWeight: 700 }}>OS</span>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              We'll email you when it's your turn to join the beta. In the meantime, 
              follow us on social media for updates and behind-the-scenes content.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" size="sm">
                Follow Updates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl lg:text-7xl mb-6 leading-tight">
              <span style={{ fontWeight: 400 }}>Backstage</span>
              <span style={{ fontWeight: 700 }}>OS</span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 opacity-90 leading-relaxed">One System. One Place. One Truth.</p>
            <div className="flex justify-center space-x-2 mb-4">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
            </div>
            <p className="text-lg mb-8">Loved by professional stage managers worldwide</p>
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-4"
              onClick={() => document.getElementById('waitlist-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Join the Waitlist
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need for Stage Management</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              BackstageOS provides comprehensive tools for every phase of the production process, 
              from prep to closing night.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={`border-0 shadow-lg ${feature.comingSoon ? 'opacity-75' : ''}`}>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    {feature.comingSoon && (
                      <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                        <Sparkles className="h-3 w-3" />
                        Coming Soon
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Workflow Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Your Complete Production Workflow
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">BackstageOS streamlines every step of your production process.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workflow.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                      <step.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Technology Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">A System Made for Stage Managers</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Reimagine what's possible when technology truly serves the art of live entertainment.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {technologies.map((tech, index) => (
              <div key={index} className="flex items-start space-x-6">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <tech.icon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">{tech.title}</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">{tech.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Waitlist Form Section */}
      <section id="waitlist-form" className="py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Join the Beta Version
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Limited beta access is coming soon.</p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select onValueChange={(value) => handleSelectChange("experience", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="educational">Educational/Academic</SelectItem>
                      <SelectItem value="community">Community Theater</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="howHeard">How did you hear about us?</Label>
                  <Select onValueChange={(value) => handleSelectChange("howHeard", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="referral">Referral from colleague</SelectItem>
                      <SelectItem value="search">Search Engine</SelectItem>
                      <SelectItem value="conference">Theater Conference</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="additionalInfo">Tell us about your biggest stage management challenges (optional)</Label>
                  <Textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    placeholder="What production challenges could BackstageOS help you solve?"
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Joining Waitlist...
                    </>
                  ) : (
                    <>
                      Join the Waitlist
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-sm text-gray-500 text-center">By joining the waitlist, you agree to receive updates about BackstageOS. 
                We respect your privacy and will never share your information.</p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center space-y-2">
            <h3 className="text-2xl mb-0">
              <span style={{ fontWeight: 400 }}>Backstage</span>
              <span style={{ fontWeight: 700 }}>OS</span>
            </h3>
            <p className="text-gray-400 max-w-2xl mx-auto">One System. One Place. One Truth.</p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="/security" className="text-gray-400 hover:text-white transition">Security</a>
              <a href="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</a>
              <a href="/terms" className="text-gray-400 hover:text-white transition">Terms of Service</a>
            </div>
            <div className="text-sm text-gray-500">© 2025 BackstageOS. All rights reserved.<span className="block sm:inline"> Created by Bryan Runion</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}