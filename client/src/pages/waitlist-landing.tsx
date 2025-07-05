import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { 
  FileText, 
  Users, 
  Calendar, 
  Clapperboard, 
  Settings, 
  Shield,
  CheckCircle
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
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Hero Content */}
        <div className="text-white space-y-8">
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight">
              BackstageOS
            </h1>
            <p className="text-xl lg:text-2xl opacity-90 leading-relaxed">
              The complete stage management platform for modern theater professionals
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Clapperboard className="h-4 w-4" />
              </div>
              <span>Show-Centric Organization</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <span>Professional Reports & Templates</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <span>Team & Cast Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
              <span>Scheduling & Call Sheets</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Settings className="h-4 w-4" />
              </div>
              <span>Script & Cue Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <span>Secure Collaboration</span>
            </div>
          </div>
        </div>

        {/* Waitlist Card */}
        <Card className="max-w-md mx-auto w-full">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Join the Waitlist</h2>
              <p className="text-gray-600">Be first to access the future of stage management</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="experience">Experience Level *</Label>
                <Select onValueChange={(value) => handleSelectChange('experience', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student/Training</SelectItem>
                    <SelectItem value="emerging">Emerging Professional (0-2 years)</SelectItem>
                    <SelectItem value="experienced">Experienced (3-10 years)</SelectItem>
                    <SelectItem value="senior">Senior Professional (10+ years)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Joining..." : "Join the Waitlist"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}