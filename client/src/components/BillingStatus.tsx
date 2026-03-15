import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreditCard, Calendar, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string;
  plan: string | null;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

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

export default function BillingStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/billing/subscription-status"],
  });

  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["/api/billing/plans"],
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing/cancel-subscription"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription-status"] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will remain active until the end of your billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>;
      case 'trialing':
        return <Badge variant="secondary">
          <Calendar className="w-3 h-3 mr-1" />
          Trial
        </Badge>;
      case 'past_due':
        return <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Past Due
        </Badge>;
      case 'canceled':
        return <Badge variant="outline">
          <XCircle className="w-3 h-3 mr-1" />
          Canceled
        </Badge>;
      case 'incomplete':
        return <Badge variant="outline">
          <AlertCircle className="w-3 h-3 mr-1" />
          Incomplete
        </Badge>;
      default:
        return <Badge variant="outline">No Subscription</Badge>;
    }
  };

  const formatPlanName = (plan: string | null) => {
    if (!plan) return 'No Plan';
    const matchingPlan = billingPlans.find(p => p.planId === plan);
    return matchingPlan?.name || plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const formatPrice = (price: number | string, interval: string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (interval === "year") {
      const monthlyEquivalent = Math.round(numPrice / 12);
      return `$${monthlyEquivalent.toLocaleString()}/mo (billed annually at $${numPrice.toLocaleString()})`;
    }
    return `$${numPrice.toLocaleString()}/mo`;
  };

  const getPlanPrice = (plan: string | null) => {
    if (!plan) return '';
    const matchingPlan = billingPlans.find(p => p.planId === plan);
    if (!matchingPlan) return '';
    return formatPrice(matchingPlan.price, matchingPlan.billingInterval);
  };

  if (isLoading || plansLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load billing information.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing Status
        </CardTitle>
        <CardDescription>
          Manage your BackstageOS subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Current Status</p>
            <p className="text-sm text-muted-foreground">
              {formatPlanName(subscription.plan)} Plan
            </p>
          </div>
          {getStatusBadge(subscription.status)}
        </div>

        <Separator />

        {/* Plan Details */}
        {subscription.hasSubscription && (
          <div className="space-y-4">
            <div>
              <p className="font-medium">Plan Details</p>
              <p className="text-sm text-muted-foreground">
                {getPlanPrice(subscription.plan)}
              </p>
            </div>

            {subscription.currentPeriodEnd && (
              <div>
                <p className="font-medium">
                  {subscription.cancelAtPeriodEnd ? 'Subscription ends on' : 'Next billing date'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(subscription.currentPeriodEnd * 1000), 'MMMM d, yyyy')}
                </p>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel your subscription? You'll continue to have access 
                        until the end of your current billing period.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelSubscriptionMutation.mutate()}
                        disabled={cancelSubscriptionMutation.isPending}
                      >
                        {cancelSubscriptionMutation.isPending ? 'Canceling...' : 'Cancel Subscription'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {subscription.status === 'past_due' && (
                <Button 
                  onClick={() => window.location.href = `/pricing?plan=${subscription.plan}`}
                  size="sm"
                >
                  Update Payment Method
                </Button>
              )}
            </div>
          </div>
        )}

        {/* No Subscription */}
        {!subscription.hasSubscription && (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have an active subscription.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {billingPlans
                .filter(p => p.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((plan) => (
                  <Button 
                    key={plan.id}
                    onClick={() => window.location.href = `/pricing?plan=${plan.planId}`}
                    variant={plan.billingInterval === 'year' ? 'default' : 'outline'}
                    size="sm"
                  >
                    {plan.name} - {formatPrice(plan.price, plan.billingInterval)}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}