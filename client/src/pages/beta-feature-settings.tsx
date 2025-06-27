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
  limitedAccess: boolean;
  fullAccess: boolean;
}

interface BetaSettings {
  features: FeatureConfig[];
}

export default function BetaFeatureSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BetaSettings>({ features: [] });

  const { data: betaSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/beta-settings'],
    select: (data: BetaSettings) => data,
  });

  const saveMutation = useMutation({
    mutationFn: (data: BetaSettings) => 
      apiRequest('PUT', '/api/admin/beta-settings', data),
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Beta feature settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/beta-settings'] });
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

  const handleFeatureToggle = (featureId: string, accessLevel: 'limited' | 'full', enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      features: prev.features.map(feature =>
        feature.id === featureId
          ? {
              ...feature,
              [accessLevel === 'limited' ? 'limitedAccess' : 'fullAccess']: enabled
            }
          : feature
      )
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
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
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to User Management
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Beta Feature Settings</h1>
            <p className="text-muted-foreground">
              Configure which features are available to Limited and Full beta access users
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {categories.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>
                  Configure access levels for {category.toLowerCase()} features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.features
                  .filter(feature => feature.category === category)
                  .map(feature => (
                    <div key={feature.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{feature.name}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${feature.id}-limited`}
                            checked={feature.limitedAccess}
                            onCheckedChange={(checked) => 
                              handleFeatureToggle(feature.id, 'limited', checked)
                            }
                          />
                          <Label htmlFor={`${feature.id}-limited`} className="text-sm">
                            Limited Beta Access
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${feature.id}-full`}
                            checked={feature.fullAccess}
                            onCheckedChange={(checked) => 
                              handleFeatureToggle(feature.id, 'full', checked)
                            }
                          />
                          <Label htmlFor={`${feature.id}-full`} className="text-sm">
                            Full Beta Access
                          </Label>
                        </div>
                      </div>
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