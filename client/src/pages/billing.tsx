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
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  Check, 
  X, 
  ExternalLink,
  Loader2 
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

  // Switch between monthly and annual plans
  const switchPlanMutation = useMutation({
    mutationFn: async (interval: 'month' | 'year') => {
      const res = await apiRequest('POST', '/api/billing/switch-plan', { interval });
      return res.json();
    },
    onSuccess: (data, interval) => {
      toast({
        title: "Plan Updated",
        description: `Successfully switched to ${interval === 'year' ? 'annual' : 'monthly'} billing${interval === 'year' ? ' with 18% savings!' : '.'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Plan Switch Failed",
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

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Subscription Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Options
            </CardTitle>
            <CardDescription>
              Manage your subscription plan and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Trial Management */}
            {subscriptionData?.status === 'trialing' && (
              <>
                <div className="text-sm text-muted-foreground mb-3">
                  Your 30-day free trial is active. Choose a plan before it ends to continue using BackstageOS.
                </div>
                
                {getMonthlyPlan() && (
                  <Button 
                    onClick={() => window.location.href = `/subscribe?plan=${getMonthlyPlan()!.planId}`}
                    className="w-full"
                  >
                    Choose {getMonthlyPlan()!.name} ({formatPlanPrice(getMonthlyPlan()!)})
                  </Button>
                )}
                
                {getAnnualPlan() && (
                  <Button 
                    onClick={() => window.location.href = `/subscribe?plan=${getAnnualPlan()!.planId}`}
                    className="w-full"
                    variant="outline"
                  >
                    Choose {getAnnualPlan()!.name} ({formatPlanPrice(getAnnualPlan()!)} - Save {calculateSavings()}%)
                  </Button>
                )}
                
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
              </>
            )}

            {/* Active Subscription Management */}
            {subscriptionData?.status === 'active' && (
              <>
                {/* Plan switching options */}
                {subscriptionData.interval === 'month' && getAnnualPlan() && (
                  <Button 
                    onClick={() => switchPlanMutation.mutate('year')}
                    disabled={switchPlanMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {switchPlanMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      `Switch to Annual (Save ${calculateSavings()}%)`
                    )}
                  </Button>
                )}

                {subscriptionData.interval === 'year' && (
                  <Button 
                    onClick={() => switchPlanMutation.mutate('month')}
                    disabled={switchPlanMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {switchPlanMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Switch to Monthly Billing'
                    )}
                  </Button>
                )}
                
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              </>
            )}

            {/* Canceled Subscription */}
            {subscriptionData?.status === 'canceled' && (
              <>
                <div className="text-sm text-muted-foreground mb-3">
                  Your subscription is canceled. You can still access the app until {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}.
                </div>
                
                {getMonthlyPlan() && (
                  <Button 
                    onClick={() => window.location.href = `/subscribe?plan=${getMonthlyPlan()!.planId}`}
                    className="w-full"
                  >
                    Reactivate {getMonthlyPlan()!.name}
                  </Button>
                )}
                
                {getAnnualPlan() && (
                  <Button 
                    onClick={() => window.location.href = `/subscribe?plan=${getAnnualPlan()!.planId}`}
                    className="w-full"
                    variant="outline"
                  >
                    Reactivate {getAnnualPlan()!.name}
                  </Button>
                )}
              </>
            )}

            {/* Past Due */}
            {subscriptionData?.status === 'past_due' && (
              <>
                <Button
                  onClick={() => window.open('https://billing.stripe.com/p/login/test_00000000001', '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Update Payment Method
                </Button>
              </>
            )}

            {/* No active subscription */}
            {(!subscriptionData?.status || subscriptionData?.status === 'incomplete') && (
              <>
                {getMonthlyPlan() && (
                  <Button 
                    onClick={() => window.location.href = `/subscribe?plan=${getMonthlyPlan()!.planId}`}
                    className="w-full"
                  >
                    Start {getMonthlyPlan()!.name} ({formatPlanPrice(getMonthlyPlan()!)})
                  </Button>
                )}
                
                {getAnnualPlan() && (
                  <Button 
                    onClick={() => window.location.href = `/subscribe?plan=${getAnnualPlan()!.planId}`}
                    className="w-full"
                    variant="outline"
                  >
                    Start {getAnnualPlan()!.name} ({formatPlanPrice(getAnnualPlan()!)} - Save {calculateSavings()}%)
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>


      </div>

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