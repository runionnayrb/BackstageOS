import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  Check, 
  X, 
  ExternalLink,
  Loader2,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface BillingPlan {
  id: number;
  planId: string;
  name: string;
  description?: string;
  price: number;
  billingInterval: string;
  trialDays: number;
  features: string[];
  maxProjects?: number;
  maxTeamMembers?: number;
  isActive: boolean;
  sortOrder: number;
  stripeProductId?: string;
  activeStripePriceId?: string;
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Get current subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/billing/status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/billing/status');
      return res.json();
    }
  });

  // Fetch billing plans from admin dashboard
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["/api/billing/plans"],
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/billing/cancel-subscription');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled. You'll retain access until the end of your billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Cancel trial mutation
  const cancelTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/billing/cancel-trial');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trial Canceled",
        description: "Your trial has been canceled. You can continue using the app until your trial period ends.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Trial Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });





  // Helper functions for pricing
  const getMonthlyPlan = () => billingPlans.find(p => p.billingInterval === 'month' && p.isActive);
  const getAnnualPlan = () => billingPlans.find(p => p.billingInterval === 'year' && p.isActive);

  const formatPlanPrice = (plan: BillingPlan) => {
    if (plan.billingInterval === 'month') {
      return `$${plan.price.toLocaleString()}/month`;
    } else if (plan.billingInterval === 'year') {
      const monthlyEquivalent = Math.round(plan.price / 12);
      return `$${plan.price.toLocaleString()}/year (${monthlyEquivalent}/mo)`;
    }
    return `$${plan.price.toLocaleString()}`;
  };

  const calculateSavings = () => {
    const monthly = getMonthlyPlan();
    const annual = getAnnualPlan();
    if (!monthly || !annual) return 0;
    const monthlyYearlyCost = monthly.price * 12;
    const savings = Math.round(((monthlyYearlyCost - annual.price) / monthlyYearlyCost) * 100);
    return savings;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800"><Calendar className="w-3 h-3 mr-1" />Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary"><X className="w-3 h-3 mr-1" />Canceled</Badge>;
      case 'incomplete':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Incomplete</Badge>;
      case 'free':
        return <Badge className="bg-purple-100 text-purple-800">Free Account</Badge>;
      default:
        return <Badge variant="secondary">No Subscription</Badge>;
    }
  };

  // Helper to determine if a plan change is an upgrade or downgrade
  const getPlanChangeType = (targetPlanId: string): 'upgrade' | 'downgrade' | null => {
    const currentPlanId = subscriptionData?.plan;
    if (!currentPlanId) return null;

    const currentPlan = billingPlans.find(p => p.planId === currentPlanId);
    const targetPlan = billingPlans.find(p => p.planId === targetPlanId);
    if (!currentPlan || !targetPlan) return null;

    // Extract tier and interval from plan IDs
    // Assumes format: "freelance-monthly", "full-timer-annual", "team-monthly", etc.
    const getCurrentTier = (planId: string) => {
      if (planId.startsWith('freelance')) return 'freelance';
      if (planId.startsWith('full-timer') || planId.startsWith('fulltime')) return 'fulltime';
      if (planId.startsWith('team')) return 'team';
      return 'unknown';
    };

    const currentTier = getCurrentTier(currentPlanId);
    const targetTier = getCurrentTier(targetPlanId);
    const currentInterval = currentPlan.billingInterval;
    const targetInterval = targetPlan.billingInterval;

    // Team plans are always upgrades from freelance/fulltime
    if (targetTier === 'team' && (currentTier === 'freelance' || currentTier === 'fulltime')) {
      return 'upgrade';
    }

    // Moving from team to freelance/fulltime is always a downgrade
    if (currentTier === 'team' && (targetTier === 'freelance' || targetTier === 'fulltime')) {
      return 'downgrade';
    }

    // Same tier: monthly → annual is upgrade, annual → monthly is downgrade
    if (currentTier === targetTier) {
      if (currentInterval === 'month' && targetInterval === 'year') return 'upgrade';
      if (currentInterval === 'year' && targetInterval === 'month') return 'downgrade';
    }

    return null;
  };

  // Get available upgrade and downgrade options
  const getAvailablePlans = () => {
    const currentPlanId = subscriptionData?.plan;
    return billingPlans
      .filter(p => p.isActive && p.planId !== currentPlanId) // Exclude current plan
      .map(plan => ({
        ...plan,
        changeType: getPlanChangeType(plan.planId)
      }))
      .filter(p => p.changeType !== null); // Only show valid upgrades/downgrades
  };

  if (isLoading || plansLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your BackstageOS subscription and billing preferences
        </p>
      </div>

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Current Plan
            {subscriptionData?.status && getStatusBadge(subscriptionData.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Plan Type</p>
              <p className="text-lg">{subscriptionData?.planName || 'No active subscription'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Billing</p>
              <p className="text-lg">
                {subscriptionData?.amount ? 
                  `$${subscriptionData.amount}/${subscriptionData.interval}` : 
                  'N/A'
                }
              </p>
            </div>
            {subscriptionData?.currentPeriodEnd && (
              <div>
                <p className="text-sm font-medium">
                  {subscriptionData.status === 'canceled' ? 'Access Until' : 'Next Billing Date'}
                </p>
                <p className="text-lg">
                  {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
            {subscriptionData?.trialEnd && subscriptionData.status === 'trialing' && (
              <div>
                <p className="text-sm font-medium">Trial Ends</p>
                <p className="text-lg">
                  {new Date(subscriptionData.trialEnd).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Status-specific alerts */}
          {subscriptionData?.status === 'past_due' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your payment is overdue. Please update your payment method to continue using BackstageOS.
              </AlertDescription>
            </Alert>
          )}

          {subscriptionData?.status === 'trialing' && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                You're on a 30-day free trial. Choose a plan before your trial ends to continue using BackstageOS.
              </AlertDescription>
            </Alert>
          )}

          {subscriptionData?.status === 'canceled' && subscriptionData?.trialEnd && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your trial has been canceled. You can use the app until {new Date(subscriptionData.trialEnd).toLocaleDateString()}, then you'll be redirected to the payment screen to continue.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Change Plan - Upgrade/Downgrade */}
      {subscriptionData?.status === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Plan</CardTitle>
            <CardDescription>Upgrade or downgrade your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select a different plan</label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="w-full" data-testid="select-plan-dropdown">
                  <SelectValue placeholder="Choose a plan to switch to..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePlans()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((plan) => (
                      <SelectItem 
                        key={plan.id} 
                        value={plan.planId}
                        data-testid={`plan-option-${plan.planId}`}
                      >
                        <div className="flex items-center gap-2">
                          {plan.changeType === 'upgrade' && <ArrowUp className="w-4 h-4 text-green-600" />}
                          {plan.changeType === 'downgrade' && <ArrowDown className="w-4 h-4 text-orange-600" />}
                          <span>{plan.name}</span>
                          <span className="text-muted-foreground">
                            — {formatPlanPrice(plan)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlanId && (() => {
              const selectedPlan = billingPlans.find(p => p.planId === selectedPlanId);
              const changeType = getPlanChangeType(selectedPlanId);
              return selectedPlan ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {changeType === 'upgrade' && (
                        <>Upgrading will take effect immediately and you'll be charged a prorated amount.</>
                      )}
                      {changeType === 'downgrade' && (
                        <>Downgrading will take effect at the end of your current billing period.</>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">New Plan:</span>
                      <span className="text-lg font-semibold">{selectedPlan.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">New Price:</span>
                      <span className="text-lg font-semibold text-primary">
                        {formatPlanPrice(selectedPlan)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    data-testid="button-confirm-plan-change"
                    onClick={() => {
                      toast({
                        title: "Plan Change",
                        description: "Plan switching functionality coming soon!",
                      });
                    }}
                  >
                    {changeType === 'upgrade' ? 'Upgrade Now' : 'Schedule Downgrade'}
                  </Button>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}

        {/* Subscription Management - Only show for active/trialing subscriptions */}
        {(subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Management
              </CardTitle>
              <CardDescription>
                Manage your payment methods and subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
            {subscriptionData?.status === 'active' && (
              <>
                <Button
                  onClick={() => window.open('https://billing.stripe.com/p/login/test_00000000001', '_blank')}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Payment Methods
                </Button>

                <Button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4" />
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              </>
            )}

            {subscriptionData?.status === 'trialing' && (
              <Button
                onClick={() => cancelTrialMutation.mutate()}
                disabled={cancelTrialMutation.isPending}
                variant="destructive"
                className="w-full"
              >
                {cancelTrialMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Cancel Trial'
                )}
              </Button>
            )}

            {subscriptionData?.status === 'past_due' && (
              <Button
                onClick={() => window.open('https://billing.stripe.com/p/login/test_00000000001', '_blank')}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Update Payment Method
              </Button>
            )}
          </CardContent>
        </Card>
        )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your payment history and download invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => window.open('https://billing.stripe.com/p/login/test_00000000001', '_blank')}
            variant="outline"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Billing History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}