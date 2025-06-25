import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Briefcase, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSelection() {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (profileType: string) => {
      await apiRequest("POST", "/api/auth/profile-type", { profileType });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been set up successfully!",
      });
      // The router will automatically redirect based on user state
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSelect = (type: string) => {
    setSelectedProfile(type);
    mutation.mutate(type);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Profile Type</h2>
          <p className="text-lg text-gray-600">Select the workflow that best matches how you work</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Freelance Profile */}
          <Card 
            className={`cursor-pointer transition-all border-2 ${
              selectedProfile === 'freelance' 
                ? 'border-primary bg-blue-50' 
                : 'border-transparent hover:border-primary'
            }`}
            onClick={() => handleProfileSelect('freelance')}
          >
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Freelance</h3>
                <p className="text-gray-600">For stage managers working on multiple shows with different teams</p>
              </div>
              
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Create multiple independent projects
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Flexible team roles per project
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Customizable templates per project
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Project-based reporting
                </li>
              </ul>
              
              <Button 
                className="w-full mt-6 bg-primary hover:bg-primary/90"
                disabled={mutation.isPending && selectedProfile === 'freelance'}
              >
                {mutation.isPending && selectedProfile === 'freelance' ? "Setting up..." : "Choose Freelance"}
              </Button>
            </CardContent>
          </Card>

          {/* Full-Time Profile */}
          <Card 
            className={`cursor-pointer transition-all border-2 ${
              selectedProfile === 'fulltime' 
                ? 'border-secondary bg-purple-50' 
                : 'border-transparent hover:border-secondary'
            }`}
            onClick={() => handleProfileSelect('fulltime')}
          >
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Full-Time</h3>
                <p className="text-gray-600">For stage managers working in-house at a theater or company</p>
              </div>
              
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Season and show organization
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Consistent team structure
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Standardized templates
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Company-wide reporting
                </li>
              </ul>
              
              <Button 
                className="w-full mt-6 bg-secondary hover:bg-secondary/90"
                disabled={mutation.isPending && selectedProfile === 'fulltime'}
              >
                {mutation.isPending && selectedProfile === 'fulltime' ? "Setting up..." : "Choose Full-Time"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
