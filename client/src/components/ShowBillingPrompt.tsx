import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Clock, AlertCircle, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ShowBillingPromptProps {
  projectId: number;
  projectName: string;
  onActivated?: () => void;
}

interface BillingSummary {
  projectId: number;
  billingType: 'limited_run' | 'long_running';
  billingStatus: string;
  showStartDate: string;
  showEndDate: string | null;
  activationFeePaid: boolean;
  trialEndsAt: Date | null;
  trialActive: boolean;
  trialDaysRemaining: number | null;
  monthlyBillingStartsAt: string | null;
  monthlyBillingActive: boolean;
  hasActiveSubscription: boolean;
  dueToday: number;
  monthlyAmount: number | null;
}

export default function ShowBillingPrompt({ projectId, projectName, onActivated }: ShowBillingPromptProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: billing, isLoading, error } = useQuery<BillingSummary>({
    queryKey: ['/api/shows', projectId, 'billing'],
    queryFn: async () => {
      const response = await fetch(`/api/shows/${projectId}/billing`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch billing');
      }
      return response.json();
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const response = await apiRequest("POST", `/api/shows/${projectId}/billing/activate`, {
        successUrl: `${window.location.origin}/shows/${projectId}?billing=success`,
        cancelUrl: `${window.location.origin}/shows/${projectId}?billing=canceled`,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.alreadyPaid) {
        toast({ title: "Already Activated", description: "This show has already been activated." });
        queryClient.invalidateQueries({ queryKey: ['/api/shows', projectId, 'billing'] });
        onActivated?.();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to start payment process",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!billing) {
    return null;
  }

  if (billing.billingStatus === 'active' || billing.trialActive) {
    return null;
  }

  const isTrialExpired = billing.billingStatus === 'trial' && !billing.trialActive;
  const isUnpaid = billing.billingStatus === 'unpaid';

  if (!isTrialExpired && !isUnpaid) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">
            {isTrialExpired ? "Free Trial Ended" : "Payment Required"}
          </CardTitle>
          <CardDescription className="text-base">
            {isTrialExpired 
              ? `Your 14-day free trial for "${projectName}" has expired.`
              : `Payment is required to access "${projectName}".`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Show Type</span>
              <Badge variant="secondary">
                {billing.billingType === 'limited_run' ? 'Limited Run' : 'Long Running'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Activation Fee</span>
              <span className="text-2xl font-bold text-primary">$400</span>
            </div>
            {billing.billingType === 'long_running' && (
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Monthly (after 6 months)</span>
                <span>+$100/month</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Unlimited team members</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>All features included</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>No per-seat charges</span>
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => activateMutation.mutate()}
            disabled={isProcessing || activateMutation.isPending}
          >
            {isProcessing || activateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay $400 to Activate
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Stripe. You can close or archive your show anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
