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
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't keep in cache
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
    
    // Admin bypass: Only bypass user access restrictions, NOT beta configuration
    // This allows admins to test disabled features as they would appear to users
    const isViewingAsAdmin = switchStatus?.isViewingAs && switchStatus?.viewingUser?.id === user?.id;
    const isOriginalAdmin = user?.isAdmin && !switchStatus?.isViewingAs;
    const isAdmin = user?.isAdmin && (isOriginalAdmin || isViewingAsAdmin);
    
    console.log(`🔍 Admin access check:`, {
      userIsAdmin: user?.isAdmin,
      isOriginalAdmin,
      isViewingAsAdmin,
      isAdmin,
      featureEnabled: isFeatureEnabled(featureId)
    });
    
    // Feature must be enabled in beta configuration first
    if (!isFeatureEnabled(featureId)) {
      console.log(`❌ Feature ${featureId} disabled in beta configuration`);
      return false;
    }
    
    // If admin and feature is enabled, bypass user access check
    if (isAdmin) {
      console.log(`✅ Admin has access to enabled feature ${featureId}`);
      return true;
    }
    
    // For non-admin users, check both beta settings and user access
    const result = hasUserAccess(featureId);
    console.log(`${result ? '✅' : '❌'} User access result for ${featureId}:`, result);
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