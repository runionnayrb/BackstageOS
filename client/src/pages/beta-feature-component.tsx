import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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

// Default feature configuration
const DEFAULT_FEATURES: FeatureConfig[] = [
  {
    id: 'script-editor',
    name: 'Script Editor',
    description: 'Advanced script editing with cue building and visual overlays',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'props-tracker',
    name: 'Props Tracker',
    description: 'Scene/character organization and status tracking for props',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'costume-tracker',
    name: 'Costume Tracker',
    description: 'Quick-change timing and repair tracking for costumes',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'advanced-templates',
    name: 'Advanced Templates',
    description: 'Custom field types and dynamic template configuration',
    category: 'Reports & Templates',
    limitedAccess: true,
    fullAccess: true,
  },
  {
    id: 'team-collaboration',
    name: 'Team Collaboration',
    description: 'Enhanced team member permissions and collaboration tools',
    category: 'Team Management',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'calendar-management',
    name: 'Calendar Management',
    description: 'Advanced scheduling and calendar features',
    category: 'Planning',
    limitedAccess: true,
    fullAccess: true,
  },
  {
    id: 'cast-management',
    name: 'Cast Management',
    description: 'Character breakdowns and cast tracking tools',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'task-boards',
    name: 'Task Boards',
    description: 'Kanban-style task management and workflow tracking',
    category: 'Planning',
    limitedAccess: true,
    fullAccess: true,
  }
];

export default function BetaFeatureComponent() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BetaSettings>({ features: DEFAULT_FEATURES });

  const { data: betaSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/beta-settings'],
    select: (data: BetaSettings) => data,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: BetaSettings) => 
      apiRequest('/api/admin/beta-settings', {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
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
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const categories = Array.from(new Set(settings.features.map(f => f.category)));

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Configure which features are available to Limited and Full beta access users
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

      <div className="flex justify-end">
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
  );
}