import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

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

interface SwitchStatus {
  isViewingAs: boolean;
  viewingUser?: any;
}

export function useBetaFeatures() {
  const { user } = useAuth();
  
  // Get switch status to determine effective user
  const { data: switchStatus } = useQuery<SwitchStatus>({
    queryKey: ['/api/admin/switch-status'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  
  // Use effective user (viewing user if switched, otherwise original user)
  const effectiveUser = switchStatus?.isViewingAs ? switchStatus.viewingUser : user;

  const { data: betaSettings, isLoading } = useQuery<BetaSettings>({
    queryKey: ['/api/admin/beta-settings'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes for better performance
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false,
  });

  const isFeatureEnabled = (featureId: string): boolean => {
    if (isLoading || !betaSettings) return false;
    
    const feature = betaSettings.features?.find((f: FeatureConfig) => f.id === featureId);
    return feature?.enabled || false;
  };

  const hasUserAccess = (featureId: string): boolean => {
    if (!effectiveUser) return false;
    
    // Owner always has access (from middleware)
    if (effectiveUser.id.toString() === '44106967') {
      return true;
    }

    // User must have beta access enabled
    if (!effectiveUser.betaAccess) return false;
    
    // If user has beta access, they can access any globally-enabled feature
    // (Global feature enablement is checked separately in canAccessFeature via isFeatureEnabled)
    return true;
  };

  const canAccessFeature = (featureId: string): boolean => {
    // Admin bypass: Only bypass user access restrictions, NOT beta configuration
    // This allows admins to test disabled features as they would appear to users
    const isViewingAsAdmin = switchStatus?.isViewingAs && switchStatus?.viewingUser?.id === user?.id;
    const isOriginalAdmin = user?.isAdmin && !switchStatus?.isViewingAs;
    const isAdmin = user?.isAdmin && (isOriginalAdmin || isViewingAsAdmin);
    
    // Feature must be enabled in beta configuration first
    if (!isFeatureEnabled(featureId)) {
      return false;
    }
    
    // If admin and feature is enabled, bypass user access check
    if (isAdmin) {
      return true;
    }
    
    // For non-admin users, check both beta settings and user access
    return hasUserAccess(featureId);
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