import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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

export function useBetaFeatures() {
  const { user } = useAuth();

  const { data: betaSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/beta-settings'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  const isFeatureEnabled = (featureId: string): boolean => {
    if (isLoading || !betaSettings) return false;
    
    const feature = betaSettings.features?.find((f: FeatureConfig) => f.id === featureId);
    return feature?.enabled || false;
  };

  const hasUserAccess = (featureId: string): boolean => {
    if (!user) return false;
    
    // Owner always has access (from middleware)
    if (user.id.toString() === '44106967') {
      return true;
    }

    // Check if user has beta access and the specific feature
    if (!user.betaAccess) return false;
    
    const betaFeatures = user.betaFeatures ? JSON.parse(user.betaFeatures as string) : [];
    return betaFeatures.includes(featureId);
  };

  const canAccessFeature = (featureId: string): boolean => {
    // Feature must be enabled in beta settings AND user must have access
    return isFeatureEnabled(featureId) && hasUserAccess(featureId);
  };

  const getFeatureStatus = (featureId: string): 'enabled' | 'disabled' | 'no-access' | 'loading' => {
    if (isLoading) return 'loading';
    
    const featureEnabled = isFeatureEnabled(featureId);
    const userAccess = hasUserAccess(featureId);
    
    if (!featureEnabled) return 'disabled';
    if (!userAccess) return 'no-access';
    return 'enabled';
  };

  return {
    betaSettings,
    isLoading,
    isFeatureEnabled,
    hasUserAccess,
    canAccessFeature,
    getFeatureStatus,
  };
}