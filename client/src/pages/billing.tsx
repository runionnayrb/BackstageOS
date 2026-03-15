import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  Check, 
  X, 
  ExternalLink,
  Loader2,
  Theater
} from "lucide-react";

interface ShowBillingSummary {
  projectId: number;
  projectName: string;
  billingType: 'limited_run' | 'long_running';
  billingStatus: string;
  showStartDate: string;
  showEndDate: string | null;
  activationFeePaid: boolean;
  activationFeePaidAt: Date | null;
  trialEndsAt: Date | null;
  trialActive: boolean;
  trialDaysRemaining: number | null;
  monthlyBillingStartsAt: string | null;
  monthlyBillingActive: boolean;
  hasActiveSubscription: boolean;
  dueToday: number;
  monthlyAmount: number | null;
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/billing/status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/billing/status');
      return res.json();
    }
  });

  const customerPortalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/customer-portal');
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Open Billing Portal",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    }
  });

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const hasSubscription = subscriptionData?.status && 
    ['active', 'trialing', 'past_due'].includes(subscriptionData.status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your BackstageOS subscription
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Your Subscription
            </span>
            {subscriptionData?.status && getStatusBadge(subscriptionData.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{subscriptionData?.planName || 'No active plan'}</span>
            </div>
            {subscriptionData?.amount && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium">
                  ${subscriptionData.amount}/{subscriptionData.interval}
                </span>
              </div>
            )}
            {subscriptionData?.currentPeriodEnd && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  {subscriptionData.status === 'canceled' ? 'Access Until' : 'Next Billing'}
                </span>
                <span className="font-medium">
                  {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
            {subscriptionData?.trialEnd && subscriptionData.status === 'trialing' && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Trial Ends</span>
                <span className="font-medium">
                  {new Date(subscriptionData.trialEnd).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

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
                You're on a free trial. Your subscription will begin when the trial ends.
              </AlertDescription>
            </Alert>
          )}

          {hasSubscription && (
            <Button
              onClick={() => customerPortalMutation.mutate()}
              disabled={customerPortalMutation.isPending}
              className="w-full"
              size="lg"
            >
              {customerPortalMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage Subscription & Payment Methods
            </Button>
          )}

          {!hasSubscription && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                You don't have an active subscription.
              </p>
              <Button asChild>
                <a href="/pricing">View Plans</a>
              </Button>
            </div>
          )}

          {hasSubscription && (
            <p className="text-xs text-muted-foreground text-center">
              Update payment methods, view invoices, change plans, or cancel your subscription in the billing portal.
            </p>
          )}
        </CardContent>
      </Card>

      <ShowsBillingSection toast={toast} />
    </div>
  );
}

function ShowsBillingSection({ toast }: { toast: any }) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: showsBilling = [], isLoading: billingLoading } = useQuery<ShowBillingSummary[]>({
    queryKey: ['/api/billing/shows'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/billing/shows');
      return res.json();
    },
    enabled: (projects as any[]).length > 0,
  });

  const activateMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/shows/${projectId}/billing/activate`, {
        successUrl: `${window.location.origin}/billing?billing=success`,
        cancelUrl: `${window.location.origin}/billing?billing=canceled`,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start payment",
        variant: "destructive",
      });
    },
  });

  if (projectsLoading || billingLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800',
    unpaid: 'bg-red-100 text-red-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  if (showsBilling.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Theater className="h-5 w-5" />
            Show Billing
          </CardTitle>
          <CardDescription>Manage billing for your individual shows.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No shows with billing set up yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Theater className="h-5 w-5" />
          Show Billing
        </CardTitle>
        <CardDescription>Manage billing for your individual shows.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showsBilling.map((show) => (
          <div key={show.projectId} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{show.projectName}</h4>
              <Badge className={statusColors[show.billingStatus] || 'bg-gray-100'}>
                {show.billingStatus === 'trial' && show.trialActive 
                  ? `Trial (${show.trialDaysRemaining} days left)`
                  : show.billingStatus.charAt(0).toUpperCase() + show.billingStatus.slice(1)
                }
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium">
                  {show.billingType === 'limited_run' ? 'Limited Run' : 'Long Running'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Activation Fee</span>
                <p className="font-medium">
                  {show.activationFeePaid ? (
                    <span className="text-green-600">Paid</span>
                  ) : (
                    <span className="text-orange-600">$400 Due</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Show Dates</span>
                <p className="font-medium text-xs">
                  {new Date(show.showStartDate).toLocaleDateString()} - {show.showEndDate ? new Date(show.showEndDate).toLocaleDateString() : 'Open-ended'}
                </p>
              </div>
              {show.billingType === 'long_running' && (
                <div>
                  <span className="text-muted-foreground">Monthly</span>
                  <p className="font-medium">
                    {show.monthlyBillingActive 
                      ? <span className="text-green-600">$100/mo</span>
                      : show.monthlyBillingStartsAt 
                        ? `Starts ${new Date(show.monthlyBillingStartsAt).toLocaleDateString()}`
                        : 'Not yet'
                    }
                  </p>
                </div>
              )}
            </div>

            {!show.activationFeePaid && show.billingStatus !== 'archived' && (
              <Button 
                onClick={() => activateMutation.mutate(show.projectId)}
                disabled={activateMutation.isPending}
                size="sm"
              >
                {activateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Pay Activation Fee ($400)
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
