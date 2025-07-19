import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
// Removed Card imports for cleaner interface
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
  status: 'implemented' | 'in-progress' | 'planned';
  enabled: boolean;
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
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'props-tracker',
    name: 'Props Tracker',
    description: 'Scene/character organization and status tracking for props',
    category: 'Production Tools',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'costume-tracker',
    name: 'Costume Tracker',
    description: 'Quick-change timing and repair tracking for costumes',
    category: 'Production Tools',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'advanced-templates',
    name: 'Advanced Templates',
    description: 'Custom field types and dynamic template configuration',
    category: 'Reports & Templates',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'team-collaboration',
    name: 'Team Collaboration',
    description: 'Enhanced team member permissions and collaboration tools',
    category: 'Team Management',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'calendar-management',
    name: 'Calendar Management',
    description: 'Advanced scheduling and calendar features',
    category: 'Planning & Scheduling',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'cast-management',
    name: 'Cast Management',
    description: 'Character breakdowns and cast tracking tools',
    category: 'Production Tools',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'task-boards',
    name: 'Task Boards',
    description: 'Kanban-style task management and workflow tracking',
    category: 'Planning & Scheduling',
    status: 'implemented',
    enabled: true,
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
      <div className="space-y-6">
        {categories.map(category => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-4">{category}</h3>
            <div className="space-y-4">
              {settings.features
                .filter(feature => feature.category === category)
                .map(feature => (
                  <div key={feature.id} className="p-4">
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
            </div>
          </div>
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