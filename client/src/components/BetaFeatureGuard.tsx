import { ReactNode } from "react";
import { useBetaFeatures } from "@/hooks/useBetaFeatures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock } from "lucide-react";

interface BetaFeatureGuardProps {
  featureId: string;
  children: ReactNode;
  fallback?: ReactNode;
  showAccessMessage?: boolean;
}

export default function BetaFeatureGuard({ 
  featureId, 
  children, 
  fallback,
  showAccessMessage = true 
}: BetaFeatureGuardProps) {
  const { canAccessFeature, getFeatureStatus, isLoading } = useBetaFeatures();

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const status = getFeatureStatus(featureId);

  if (status === 'enabled') {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showAccessMessage) {
    return null;
  }

  // Show appropriate message based on status
  if (status === 'disabled') {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              This feature is currently disabled by the administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator if you need access to this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'no-access') {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You don't have access to this beta feature.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to request beta access for this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}