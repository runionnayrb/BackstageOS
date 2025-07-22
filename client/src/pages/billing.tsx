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
  User, 
  AlertCircle, 
  Check, 
  X, 
  ExternalLink,
  Loader2 
} from "lucide-react";

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/billing/status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/billing/status');
      return res.json();
    }
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

  // Upgrade to annual mutation
  const upgradeToAnnualMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/billing/switch-to-annual');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Upgraded to Annual",
        description: "You've been upgraded to our annual plan with 18% savings!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Switch profile type mutation
  const switchProfileMutation = useMutation({
    mutationFn: async (profileType: string) => {
      const res = await apiRequest('POST', '/api/user/profile-type', { profileType });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile type has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      window.location.reload(); // Refresh to show updated interface
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleStartSubscription = async () => {
    setIsProcessing(true);
    try {
      const res = await apiRequest('POST', '/api/get-or-create-subscription');
      const data = await res.json();
      
      if (data.clientSecret) {
        // Redirect to subscribe page with client secret
        window.location.href = `/subscribe?plan=monthly`;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize subscription",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
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

  if (isLoading) {
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
                You're currently on a free trial. You'll be automatically billed when your trial ends unless you cancel.
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
            {!subscriptionData?.status || subscriptionData?.status === 'canceled' ? (
              <Button 
                onClick={handleStartSubscription}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Subscription'
                )}
              </Button>
            ) : (
              <>
                {subscriptionData.interval === 'month' && (
                  <Button 
                    onClick={() => upgradeToAnnualMutation.mutate()}
                    disabled={upgradeToAnnualMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {upgradeToAnnualMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Upgrade to Annual (Save 18%)'
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

                {subscriptionData.status !== 'canceled' && (
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
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your account preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Current Profile Type</p>
              <Badge variant="outline" className="mb-3">
                {user?.profileType === 'freelance' ? 'Freelance Stage Manager' : 'Full-time Theater Professional'}
              </Badge>
            </div>
            
            <Separator />
            
            <p className="text-sm text-muted-foreground">Switch profile type:</p>
            
            {user?.profileType !== 'freelance' && (
              <Button
                onClick={() => switchProfileMutation.mutate('freelance')}
                disabled={switchProfileMutation.isPending}
                variant="outline"
                className="w-full"
              >
                Switch to Freelance
              </Button>
            )}
            
            {user?.profileType !== 'fulltime' && (
              <Button
                onClick={() => switchProfileMutation.mutate('fulltime')}
                disabled={switchProfileMutation.isPending}
                variant="outline"
                className="w-full"
              >
                Switch to Full-time
              </Button>
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