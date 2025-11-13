import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
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

const SubscribeForm = ({ planKey, profileType, billingPeriod }: { planKey: string; profileType: string; billingPeriod: string }) => {
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

  const getPlanDisplay = () => {
    const labels = {
      freelance: 'Freelance',
      fulltime: 'Full-time',
      team: 'Team'
    };
    return labels[profileType as keyof typeof labels] || profileType;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Subscribe to BackstageOS
          <Badge variant="secondary" className="ml-2">
            {billingPeriod === 'annual' ? 'Save 18%' : billingPeriod === 'lifetime' ? 'One-time' : 'Monthly'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {getPlanDisplay()} {billingPeriod === 'lifetime' ? 'Lifetime' : billingPeriod === 'annual' ? 'Annual' : 'Monthly'} Plan
        </CardDescription>
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
  const [profileType, setProfileType] = useState("freelance");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual" | "lifetime">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const needsPayment = (user as any)?.needsPayment;
  const subscriptionStatus = (user as any)?.subscriptionStatus;

  const pricing = {
    freelance: { monthly: 29, annual: 285 },
    fulltime: { monthly: 49, annual: 480 },
    team: { monthly: 99, annual: 970 },
    lifetime: 599
  };

  const getPrice = () => {
    if (billingPeriod === 'lifetime') return pricing.lifetime;
    return pricing[profileType as keyof typeof pricing][billingPeriod as 'monthly' | 'annual'];
  };

  const planFeatures = {
    freelance: [
      'Solo user + 3 show editors',
      'Unlimited shows',
      'All core features',
      'Email support'
    ],
    fulltime: [
      'Solo user + 3 show editors',
      'Unlimited shows', 
      'All core features',
      'Priority email support',
      'Advanced reporting'
    ],
    team: [
      '4+ team members',
      'Unlimited shows',
      'All premium features',
      'Priority support',
      'Team collaboration tools',
      'Advanced analytics'
    ]
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const profile = urlParams.get('profile') || 'freelance';
    const billing = urlParams.get('billing') || 'monthly';
    
    setProfileType(profile);
    setBillingPeriod(billing as "monthly" | "annual" | "lifetime");
  }, []);

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

    setIsLoading(true);
    setClientSecret("");

    const planKey = billingPeriod === 'lifetime' ? 'lifetime' : `${profileType}_${billingPeriod}`;

    try {
      const data = await apiRequest("POST", "/api/get-or-create-subscription", {
        planType: planKey
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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Setting up your subscription...</p>
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
                <CardTitle>Select Your Profile Type</CardTitle>
                <CardDescription>Choose the plan that best fits your needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={profileType} onValueChange={setProfileType}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['freelance', 'fulltime', 'team'] as const).map((type) => (
                      <Label
                        key={type}
                        htmlFor={type}
                        className="flex flex-col cursor-pointer rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                      >
                        <RadioGroupItem value={type} id={type} className="sr-only" />
                        <div className="space-y-2">
                          <div className="font-semibold capitalize">{type}</div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {planFeatures[type].map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>

                <div className="border-t pt-6">
                  <Label className="text-base font-semibold mb-3 block">Billing Period</Label>
                  <RadioGroup value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as any)}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Label
                        htmlFor="monthly"
                        className="flex flex-col cursor-pointer rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="monthly" id="monthly" />
                            <span className="font-medium">Monthly</span>
                          </div>
                          <span className="text-lg font-bold">${pricing[profileType as keyof typeof pricing]?.monthly || 29}/mo</span>
                        </div>
                      </Label>
                      
                      <Label
                        htmlFor="annual"
                        className="flex flex-col cursor-pointer rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="annual" id="annual" />
                            <span className="font-medium">Annual</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">${pricing[profileType as keyof typeof pricing]?.annual || 285}/yr</div>
                            <div className="text-xs text-muted-foreground">${Math.round((pricing[profileType as keyof typeof pricing]?.annual || 285) / 12)}/mo</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="self-start">Save 18%</Badge>
                      </Label>
                      
                      <Label
                        htmlFor="lifetime"
                        className="flex flex-col cursor-pointer rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="lifetime" id="lifetime" />
                            <span className="font-medium">Lifetime</span>
                          </div>
                          <span className="text-lg font-bold">${pricing.lifetime}</span>
                        </div>
                        <Badge className="self-start">Limited Offer</Badge>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button 
                  onClick={createSubscription} 
                  className="w-full" 
                  size="lg"
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
                  <CardTitle>What's Included</CardTitle>
                  <CardDescription>
                    {profileType.charAt(0).toUpperCase() + profileType.slice(1)} Plan Features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {planFeatures[profileType as keyof typeof planFeatures].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm 
                  planKey={billingPeriod === 'lifetime' ? 'lifetime' : `${profileType}_${billingPeriod}`}
                  profileType={profileType}
                  billingPeriod={billingPeriod}
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
