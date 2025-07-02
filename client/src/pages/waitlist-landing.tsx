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
  Star
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
      description: "Every production is completely isolated with its own data, team, and workflow."
    },
    {
      icon: FileText,
      title: "Professional Reports & Templates",
      description: "Rehearsal, tech, performance, and meeting reports with custom templates."
    },
    {
      icon: Users,
      title: "Team & Cast Management",
      description: "Manage contacts, cast assignments, and team collaboration in one place."
    },
    {
      icon: Calendar,
      title: "Advanced Scheduling",
      description: "Drag-and-drop calendar with automated call sheet generation, scheduling fittings, and managing availability and conflicts."
    },
    {
      icon: Settings,
      title: "Script & Cue Management",
      description: "Built from the ground up for theatrical scripts with call script building, cue tracking, and collaborative editing designed specifically for stage managers."
    },
    {
      icon: Shield,
      title: "Secure Collaboration",
      description: "Professional-grade security with role-based permissions, sharing controls, and integrated team chat for real-time communication."
    },
    {
      icon: FileText,
      title: "Technical Paperwork",
      description: "Comprehensive tracking for props, costumes, scene shift plots, line set schedules, and mic assignments with detailed status monitoring."
    },
    {
      icon: Clock,
      title: "Prep",
      description: "Complete pre-production tools including task management, character scene breakdowns, French scene analysis, production meeting reports, and cast on-boarding workflows."
    },
    {
      icon: BarChart3,
      title: "Document & Version Control",
      description: "Professional document versioning with change tracking, collaborative commenting, PDF exports, and automated backup systems to preserve your production history."
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
      title: "Revolutionary Real-Time Collaboration",
      description: "Industry-first real-time script editing with live presence indicators, instant comments, and collaborative version control designed specifically for theater professionals."
    },
    {
      icon: Globe,
      title: "Cloud-Native Architecture",
      description: "Built from the ground up for modern theater companies with automatic backups, universal access, and enterprise-grade reliability."
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description: "Access your production data anywhere - from rehearsal rooms to backstage areas - with our responsive design optimized for theater workflows."
    },
    {
      icon: Lock,
      title: "Professional Security",
      description: "Bank-level encryption, secure sharing links, and role-based permissions ensure your production data stays protected and private."
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
              You're #{waitlistPosition} in line for early access to BackstageOS.
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
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              BackstageOS
            </h1>
            <p className="text-xl lg:text-2xl mb-8 opacity-90 leading-relaxed">
              The revolutionary stage management platform that's transforming how we collaborate, organize, and execute productions.
            </p>
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Professional Stage Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              BackstageOS provides comprehensive tools for every phase of the production process, 
              from prep to closing night.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
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
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From first read-through to closing night, BackstageOS streamlines every step 
              of your production process.
            </p>
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Pioneering Technology for Stage Managers
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're not just digitizing old workflows - we're reimagining what's possible 
              when technology truly serves the art of theater.
            </p>
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
              Join the Revolution
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Be among the first stage managers to experience the future of theater production management. 
              Limited beta access is coming soon.
            </p>
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

                <p className="text-sm text-gray-500 text-center">
                  By joining the waitlist, you agree to receive updates about BackstageOS. 
                  We respect your privacy and will never share your information.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">BackstageOS</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Revolutionizing stage management for the modern stage manager.
            </p>
            <div className="mt-8 text-sm text-gray-500">
              © 2025 BackstageOS. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}