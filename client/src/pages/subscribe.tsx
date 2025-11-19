import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ planKey, planName }: { planKey: string; planName: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment not ready",
        description: "Please wait for the payment form to load.",
        variant: "destructive",
      });
      return;
    }

    if (!isElementReady) {
      toast({
        title: "Payment form loading",
        description: "Please wait for the payment form to finish loading.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing?subscription=success`,
        },
      });

      if (error) {
        toast({
          title: "Subscription Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Subscription Failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Subscribe to BackstageOS</CardTitle>
        <CardDescription>{planName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement onReady={() => setIsElementReady(true)} />
          <Button 
            type="submit" 
            disabled={!stripe || !isElementReady || isProcessing}
            className="w-full"
            data-testid="button-submit-payment"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : !isElementReady ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading payment form...
              </>
            ) : (
              `Start Subscription`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const needsPayment = (user as any)?.needsPayment;
  const subscriptionStatus = (user as any)?.subscriptionStatus;

  // Fetch billing plans from admin settings
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/billing/plans"],
  });

  // Use the selected plan directly from URL params
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Get the selected plan object
  const selectedPlan = billingPlans.find(p => p.planId === selectedPlanId) || billingPlans.find(p => p.isActive);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    
    if (planParam) {
      setSelectedPlanId(planParam);
    } else if (billingPlans.length > 0) {
      // Default to first active plan
      const defaultPlan = billingPlans.find(p => p.isActive);
      if (defaultPlan) {
        setSelectedPlanId(defaultPlan.planId);
      }
    }
  }, [billingPlans]);

  const createSubscription = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in or create an account to subscribe.",
      });
      const currentParams = new URLSearchParams(window.location.search).toString();
      const redirectUrl = `/subscribe${currentParams ? `?${currentParams}` : ''}`;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    if (!selectedPlanId) {
      toast({
        title: "No Plan Selected",
        description: "Please select a plan to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setClientSecret("");

    try {
      const data = await apiRequest("POST", "/api/get-or-create-subscription", {
        planType: selectedPlanId
      });

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else if (data.requiresPriceConfiguration) {
        toast({
          title: "Subscription Setup Required",
          description: "Subscription pricing is not yet configured. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription Setup Failed",
          description: "Unable to initialize subscription. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Subscription Setup Failed",
        description: "Unable to initialize subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (subscriptionStatus) {
      case 'past_due':
        return {
          title: "Payment Required",
          message: "Your subscription payment is overdue. Please update your payment method to continue using BackstageOS.",
          variant: "destructive" as const
        };
      case 'canceled':
        return {
          title: "Subscription Canceled", 
          message: "Your subscription has been canceled. Subscribe again to restore access to BackstageOS.",
          variant: "destructive" as const
        };
      case 'incomplete':
        return {
          title: "Payment Setup Required",
          message: "Your payment setup is incomplete. Please complete your payment information to access BackstageOS.",
          variant: "destructive" as const
        };
      default:
        return null;
    }
  };

  if (isLoading || plansLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">{isLoading ? 'Setting up your subscription...' : 'Loading plans...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {needsPayment && getStatusMessage() && (
          <Alert variant={getStatusMessage()?.variant} className="max-w-4xl mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{getStatusMessage()?.title}</strong><br />
              {getStatusMessage()?.message}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {needsPayment ? 'Resolve Payment Issue' : 'Choose Your BackstageOS Plan'}
          </h1>
          <p className="text-xl text-muted-foreground">
            Professional stage management tools for theater professionals
          </p>
        </div>

        {!clientSecret ? (
          <div className="max-w-5xl mx-auto">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Select Your Plan</CardTitle>
                <CardDescription>Choose the plan that best fits your needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {billingPlans
                      .filter(plan => plan.isActive)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((plan) => (
                        <Label
                          key={plan.id}
                          htmlFor={plan.planId}
                          className="flex flex-col cursor-pointer rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                        >
                          <RadioGroupItem value={plan.planId} id={plan.planId} className="sr-only" />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">{plan.name}</div>
                              {plan.billingInterval === 'year' && (
                                <Badge variant="secondary" className="text-xs">Save $</Badge>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              ${plan.price.toLocaleString()}
                              <span className="text-sm text-muted-foreground">
                                /{plan.billingInterval === 'month' ? 'mo' : 'yr'}
                              </span>
                            </div>
                            {plan.billingInterval === 'year' && (
                              <div className="text-xs text-muted-foreground">
                                ${Math.round(plan.price / 12).toLocaleString()}/mo billed annually
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {plan.trialDays}-day free trial
                            </div>
                            {plan.description && (
                              <p className="text-sm text-muted-foreground">{plan.description}</p>
                            )}
                          </div>
                        </Label>
                      ))}
                  </div>
                </RadioGroup>

                <Button 
                  onClick={createSubscription} 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedPlanId}
                  data-testid="button-continue-to-payment"
                >
                  Continue to Payment
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Plan Details</CardTitle>
                  <CardDescription>
                    {selectedPlan?.name || 'Selected Plan'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold text-primary">
                      ${selectedPlan?.price.toLocaleString()}
                      <span className="text-lg text-muted-foreground">
                        /{selectedPlan?.billingInterval === 'month' ? 'month' : 'year'}
                      </span>
                    </div>
                    {selectedPlan?.billingInterval === 'year' && (
                      <p className="text-sm text-muted-foreground">
                        ${Math.round((selectedPlan?.price || 0) / 12).toLocaleString()}/mo billed annually
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {selectedPlan?.trialDays}-day free trial included
                    </p>
                    {selectedPlan?.description && (
                      <p className="text-sm">{selectedPlan.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm 
                  planKey={selectedPlanId}
                  planName={selectedPlan?.name || 'Selected Plan'}
                />
              </Elements>
              
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>By subscribing, you agree to our Terms of Service and Privacy Policy.</p>
                <p className="mt-2">You can cancel your subscription at any time.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
