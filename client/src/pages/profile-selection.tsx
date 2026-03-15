import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Calendar, FileText, Users, MessageSquare, Shirt, Package, Book, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FeaturePreferences {
  reports: boolean;
  calendar: boolean;
  script: boolean;
  props: boolean;
  costumes: boolean;
  contacts: boolean;
  chat: boolean;
  seasons: boolean;
}

export default function ProfileSelection() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeaturePreferences>({
    reports: true,
    calendar: true,
    script: true,
    props: true,
    costumes: true,
    contacts: true,
    chat: true,
    seasons: false,
  });

  const mutation = useMutation({
    mutationFn: async (featurePreferences: FeaturePreferences) => {
      await apiRequest("POST", "/api/auth/feature-preferences", { featurePreferences });
    },
    onSuccess: () => {
      toast({
        title: "Preferences Saved",
        description: "Your app preferences have been set up successfully!",
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    mutation.mutate(features);
  };

  const toggleFeature = (feature: keyof FeaturePreferences) => {
    setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  const featureList = [
    { key: 'reports' as const, name: 'Reports', description: 'Daily production and performance reports', icon: FileText, default: true },
    { key: 'calendar' as const, name: 'Calendar', description: 'Schedule management and daily calls', icon: Calendar, default: true },
    { key: 'script' as const, name: 'Script Editor', description: 'Script management and blocking notes', icon: Book, default: true },
    { key: 'props' as const, name: 'Props Tracker', description: 'Property management and tracking', icon: Package, default: true },
    { key: 'costumes' as const, name: 'Costumes', description: 'Costume tracking and quick changes', icon: Shirt, default: true },
    { key: 'contacts' as const, name: 'Contacts', description: 'Cast and crew contact management', icon: Users, default: true },
    { key: 'chat' as const, name: 'Team Chat', description: 'In-app team communication', icon: MessageSquare, default: true },
    { key: 'seasons' as const, name: 'Seasons', description: 'Organize shows by season (for venue-based work)', icon: Building2, default: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Set Up Your Workspace</h2>
          <p className="text-lg text-gray-600">Choose which features you'd like to use. You can always change these later in your show settings.</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>App Features</CardTitle>
            <CardDescription>
              Toggle the features you want available in your shows. Disabled features won't appear in navigation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {featureList.map((feature) => (
              <div key={feature.key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{feature.name}</Label>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  checked={features[feature.key]}
                  onCheckedChange={() => toggleFeature(feature.key)}
                />
              </div>
            ))}

            <div className="pt-6">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleContinue}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Setting up..." : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          These are your default preferences. Each show can have its own feature settings.
        </p>
      </div>
    </div>
  );
}
