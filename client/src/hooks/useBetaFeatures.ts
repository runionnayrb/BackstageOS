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
  
  // Get switch status to determine effective user
  const { data: switchStatus } = useQuery({
    queryKey: ['/api/admin/switch-status'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  
  // Use effective user (viewing user if switched, otherwise original user)
  const effectiveUser = switchStatus?.isViewingAs ? switchStatus.viewingUser : user;

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
    if (!effectiveUser) return false;
    
    // Owner always has access (from middleware)
    if (effectiveUser.id.toString() === '44106967') {
      return true;
    }

    // Check if user has beta access and the specific feature
    if (!effectiveUser.betaAccess) return false;
    
    try {
      const betaFeatures = effectiveUser.betaFeatures ? JSON.parse(effectiveUser.betaFeatures as string) : [];
      return betaFeatures.includes(featureId);
    } catch (error) {
      console.warn('Error parsing betaFeatures JSON:', error, 'Raw value:', effectiveUser.betaFeatures);
      return false;
    }
  };

  const canAccessFeature = (featureId: string): boolean => {
    // Debug logging
    const betaFeaturesArray = effectiveUser?.betaFeatures ? (() => {
      try {
        return JSON.parse(effectiveUser.betaFeatures as string);
      } catch {
        return [];
      }
    })() : [];
    
    console.log(`🔍 Beta Access Check for ${featureId}:`, {
      originalUserId: user?.id,
      originalUserIsAdmin: user?.isAdmin,
      effectiveUserId: effectiveUser?.id,
      effectiveUserIsAdmin: effectiveUser?.isAdmin,
      isViewingAs: switchStatus?.isViewingAs,
      viewingUserId: switchStatus?.viewingUser?.id,
      featureEnabled: isFeatureEnabled(featureId),
      userAccess: hasUserAccess(featureId),
      betaAccess: effectiveUser?.betaAccess,
      betaFeatures: betaFeaturesArray,
      rawBetaFeatures: effectiveUser?.betaFeatures
    });
    
    // Admin can bypass restrictions when viewing as themselves (not another user)
    const isViewingAsAdmin = switchStatus?.isViewingAs && switchStatus?.viewingUser?.id === user?.id;
    const isOriginalAdmin = user?.isAdmin && !switchStatus?.isViewingAs;
    
    console.log(`🔍 Admin bypass check:`, {
      userIsAdmin: user?.isAdmin,
      isOriginalAdmin,
      isViewingAsAdmin,
      canBypass: user?.isAdmin && (isOriginalAdmin || isViewingAsAdmin)
    });
    
    if (user?.isAdmin && (isOriginalAdmin || isViewingAsAdmin)) {
      console.log(`✅ Admin bypass - full access granted for ${featureId}`);
      return true;
    }
    
    // Feature must be enabled in beta settings AND effective user must have access
    const result = isFeatureEnabled(featureId) && hasUserAccess(featureId);
    console.log(`${result ? '✅' : '❌'} Beta access result for ${featureId}:`, result);
    return result;
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