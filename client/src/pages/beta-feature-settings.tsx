import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminGuard from "@/components/admin-guard";

interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'implemented' | 'in-progress' | 'planned';
  enabled: boolean;
}

interface BetaSettings {
  features: FeatureConfig[];
}

export default function BetaFeatureSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BetaSettings>({ features: [] });
  const [mountKey] = useState(() => Date.now()); // Generate once on mount

  // Force fresh data by using mount-specific key (no caching between page visits)
  const { data: betaSettings, isLoading } = useQuery({
    queryKey: [`/api/admin/beta-settings`, mountKey], // Mount-specific key
    queryFn: () => apiRequest('GET', '/api/admin/beta-settings'),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't keep in cache
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: BetaSettings) => 
      apiRequest('PUT', '/api/admin/beta-settings', data),
    onSuccess: () => {
      // Invalidate cache so other parts of app get fresh data
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/beta-settings']
      });
      toast({
        title: "Settings saved",
        description: "Beta feature settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (betaSettings) {
      setSettings(betaSettings);
    }
  }, [betaSettings]);

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      features: prev.features.map(feature =>
        feature.id === featureId
          ? { ...feature, enabled }
          : feature
      )
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  // Show loading state until we have fresh data from database
  if (isLoading || !betaSettings) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(settings.features.map(f => f.category)));

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="mb-4"></div>
          <div>
            <h1 className="text-2xl font-bold">Beta Feature Settings</h1>
            <p className="text-muted-foreground">
              Configure beta access for each feature. Features without beta access will be hidden from production users when deployed.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {categories.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>
                  Configure beta access for {category.toLowerCase()} features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.features
                  .filter(feature => feature.category === category)
                  .map(feature => (
                    <div key={feature.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{feature.name}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              feature.status === 'implemented' ? 'bg-green-100 text-green-800' :
                              feature.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {feature.status === 'implemented' ? 'Live' :
                               feature.status === 'in-progress' ? 'In Progress' :
                               'Planned'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Switch
                            id={feature.id}
                            checked={feature.enabled}
                            onCheckedChange={(checked) => 
                              handleFeatureToggle(feature.id, checked)
                            }
                            disabled={feature.status === 'planned'}
                          />
                          <Label htmlFor={feature.id} className="text-sm">
                            {feature.enabled ? 'Beta Access' : 'No Beta Access'}
                          </Label>
                        </div>
                      </div>
                      
                      {feature.status === 'planned' && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          This feature is in planning phase and cannot be enabled yet.
                        </p>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end mt-8">
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="min-w-32"
          >
            {saveMutation.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminGuard>
  );
}