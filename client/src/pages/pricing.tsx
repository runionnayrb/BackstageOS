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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, AlertCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import PublicHeader from "@/components/public-header";
import PublicFooter from "@/components/public-footer";
import Header from "@/components/layout/header";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

// Per-show pricing features
const showBillingFeatures = {
  common: [
    'Unlimited team members',
    'All core features included',
    'Full scheduling & calendar',
    'Contact management',
    'Notes & reports',
    'File attachments',
    'Email notifications',
    '14-day free trial',
  ],
  limitedRun: [
    'Perfect for shows under 6 months',
    'One-time payment',
    'No recurring charges',
  ],
  longRunning: [
    'For shows over 6 months',
    'Monthly billing starts at 6 months',
    'Cancel anytime',
  ],
  monthToMonth: [
    'Maximum flexibility',
    'No long-term commitment',
    'Cancel anytime',
  ],
};

// Legacy plan features (for users with existing subscriptions)
const planFeatures: Record<string, { included: string[]; notIncluded?: string[] }> = {
  'founder': {
    included: [
      'Up to 2 active shows',
      '1 user account',
      '3 team members',
      'Unlimited viewers',
      'All core features',
      'Priority support',
      'Request a personal walkthrough',
    ],
    notIncluded: [
      'Multiple user accounts',
      'Advanced team management',
    ]
  },
  'pro': {
    included: [
      'Up to 2 active shows',
      '1 user account',
      '3 team members',
      'Unlimited viewers',
      'All core features',
      'Email support',
      'Request a personal walkthrough',
    ],
    notIncluded: [
      'Multiple user accounts',
      'Advanced team management',
    ]
  },
  'pro-team': {
    included: [
      'Up to 8 active shows',
      'Up to 24 users',
      'Unlimited viewers',
      'All core features',
      'Advanced team management',
      'VIP support',
      'Team collaboration tools',
      'Request a personal walkthrough',
    ],
  },
};

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
          <PaymentElement 
            onReady={() => {
              console.log('Stripe PaymentElement ready');
              setIsElementReady(true);
            }}
            onLoadError={(error) => {
              console.error('Stripe PaymentElement load error:', error);
              toast({
                title: "Payment Form Error",
                description: "Unable to load payment form. Please refresh the page and try again.",
                variant: "destructive",
              });
            }}
          />
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

interface BillingPlan {
  id: number;
  planId: string;
  name: string;
  description: string | null;
  price: number;
  billingInterval: string;
  trialDays: number;
  isActive: boolean;
  stripeProductId: string | null;
}

export default function Pricing() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [billingTab, setBillingTab] = useState<'annual' | 'monthly'>('annual');
  
  const needsPayment = (user as any)?.needsPayment;
  const subscriptionStatus = (user as any)?.subscriptionStatus;

  // Fetch billing plans from admin settings (rarely changes, cache longer)
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["/api/billing/plans"],
    staleTime: 30 * 60 * 1000, // 30 minutes - plans rarely change
    gcTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Fetch founder subscriber count (can change, but cache for a bit)
  const { data: founderCount = { count: 0, limit: 50 } } = useQuery<{ count: number; limit: number }>({
    queryKey: ["/api/billing/founder-count"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Get the selected plan object
  const selectedPlan = billingPlans.find(p => p.planId === selectedPlanId);

  // Filter and organize plans
  const getDisplayPlans = () => {
    // Filter out Additional Editor plans and only show active plans
    const mainPlans = billingPlans.filter(p => 
      p.isActive && 
      !p.name.toLowerCase().includes('additional editor')
    );

    // Group by product type
    const founderPlans = mainPlans.filter(p => p.planId.includes('founder'));
    const proPlans = mainPlans.filter(p => p.planId.includes('pro') && !p.planId.includes('team'));
    const teamPlans = mainPlans.filter(p => p.planId.includes('pro-team'));

    return { founderPlans, proPlans, teamPlans };
  };

  const { founderPlans, proPlans, teamPlans } = getDisplayPlans();

  // Get plan for current billing interval
  const getPlanForInterval = (plans: BillingPlan[], interval: 'month' | 'year') => {
    return plans.find(p => p.billingInterval === interval);
  };

  // Get monthly equivalent for annual comparison
  const getMonthlyPlan = (plans: BillingPlan[]) => {
    return plans.find(p => p.billingInterval === 'month');
  };

  // Clean plan name (remove billing interval suffix)
  const cleanPlanName = (name: string) => {
    return name
      .replace(/ - Monthly$/, '')
      .replace(/ - Annual$/, '')
      .replace(/ - 6 Month$/, '');
  };

  // Get feature key from plan
  const getFeatureKey = (planId: string): string => {
    if (planId.includes('founder')) return 'founder';
    if (planId.includes('pro-team')) return 'pro-team';
    if (planId.includes('pro')) return 'pro';
    return 'pro';
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    
    if (planParam) {
      setSelectedPlanId(planParam);
      // Set tab based on plan type
      if (planParam.includes('annual')) {
        setBillingTab('annual');
      } else {
        setBillingTab('monthly');
      }
    } else if (billingPlans.length > 0 && !selectedPlanId) {
      // Default to Pro Annual plan
      const defaultPlan = billingPlans.find(p => p.planId === 'pro-annual');
      if (defaultPlan) {
        setSelectedPlanId(defaultPlan.planId);
      }
    }
  }, [billingPlans, selectedPlanId]);

  const createSubscription = async (planId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in or create an account to subscribe.",
      });
      const redirectUrl = `/pricing?plan=${planId}`;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // Check founder limit
    if (planId.includes('founder') && founderCount.count >= founderCount.limit) {
      toast({
        title: "Founder Plan Unavailable",
        description: "The Founder plan is no longer available. Please choose another plan.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlanId(planId);
    setIsLoading(true);
    setClientSecret("");

    try {
      const data = await apiRequest("POST", "/api/get-or-create-subscription", {
        planType: planId
      });

      if (data.alreadySubscribed) {
        toast({
          title: "Already Subscribed",
          description: "You already have an active subscription. Redirecting to your dashboard.",
        });
        navigate('/');
        return;
      } else if (data.clientSecret) {
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

  const isFounderAvailable = founderCount.count < founderCount.limit;
  const founderSpotsRemaining = founderCount.limit - founderCount.count;

  // Render a pricing card
  const renderPricingCard = (
    plans: BillingPlan[], 
    isAnnual: boolean, 
    highlight: boolean = false,
    isFounder: boolean = false
  ) => {
    const plan = getPlanForInterval(plans, isAnnual ? 'year' : 'month');
    const monthlyPlan = getMonthlyPlan(plans);
    
    if (!plan) return null;

    const displayName = cleanPlanName(plan.name);
    const featureKey = getFeatureKey(plan.planId);
    const features = planFeatures[featureKey];
    const monthlyEquivalent = isAnnual ? Math.round(plan.price / 12) : plan.price;
    const wouldCostMonthly = isAnnual && monthlyPlan ? monthlyPlan.price * 12 : null;
    const isUnavailable = isFounder && !isFounderAvailable;

    return (
      <Card 
        key={plan.id} 
        className={`relative flex flex-col ${highlight ? 'border-primary border-2 shadow-lg' : ''} ${isUnavailable ? 'opacity-60' : ''}`}
        data-testid={`card-plan-${plan.planId}`}
      >
        {highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
          </div>
        )}
        {isFounder && isFounderAvailable && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge variant="secondary" className="bg-amber-500 text-white">
              {founderSpotsRemaining} spots left
            </Badge>
          </div>
        )}
        {isFounder && !isFounderAvailable && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge variant="secondary" className="bg-gray-500 text-white">
              Sold Out
            </Badge>
          </div>
        )}
        
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">{displayName}</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <div className="text-center mb-6">
            {isAnnual && wouldCostMonthly && (
              <div className="text-lg text-muted-foreground line-through mb-1">
                ${wouldCostMonthly.toLocaleString()}/yr
              </div>
            )}
            <div className="text-4xl font-bold text-primary">
              ${plan.price.toLocaleString()}
              <span className="text-lg font-normal text-muted-foreground">
                /{isAnnual ? 'yr' : 'mo'}
              </span>
            </div>
            {isAnnual && (
              <div className="text-sm text-muted-foreground mt-1">
                ${(plan.price / 12).toFixed(2)}/mo billed annually
              </div>
            )}
            {plan.trialDays > 0 && (
              <div className="text-sm text-green-600 mt-2">
                {isFounder ? 'Lock in this price forever' : `${plan.trialDays}-day free trial`}
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1">
            {features?.included.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
            {features?.notIncluded?.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                <X className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <Button 
            className="w-full mt-6" 
            size="lg"
            variant={highlight ? "default" : "outline"}
            onClick={() => createSubscription(plan.planId)}
            disabled={isLoading || isUnavailable}
            data-testid={`button-select-${plan.planId}`}
          >
            {isLoading && selectedPlanId === plan.planId ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isUnavailable ? (
              'Sold Out'
            ) : (
              'Get Started'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const isLoggedIn = !!user;

  if (plansLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {isLoggedIn ? <Header /> : <PublicHeader />}
      <div className="flex-1 py-12">
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
            {needsPayment ? 'Resolve Payment Issue' : 'Simple Per-Show Pricing'}
          </h1>
          <p className="text-xl text-muted-foreground">Pay only for the shows you're working on. Unlimited team members included.</p>
        </div>

        {!clientSecret ? (
          <div className="max-w-5xl mx-auto">
            {/* Per-Show Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* Limited Run Show */}
              <Card className="relative flex flex-col">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">Limited Run</CardTitle>
                  <CardDescription>Shows under 6 months</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-primary">
                      $400
                      <span className="text-lg font-normal text-muted-foreground">
                        /show
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      One-time activation fee
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      14-day free trial
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {showBillingFeatures.limitedRun.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      {showBillingFeatures.common.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 mb-2">
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    size="lg"
                    variant="outline"
                    onClick={() => user ? navigate('/onboarding') : navigate('/auth?mode=signup&from=pricing')}
                  >
                    {user ? 'Create Your First Show' : 'Start Free Trial'}
                  </Button>
                </CardContent>
              </Card>

              {/* Long Running Show */}
              <Card className="relative flex flex-col border-primary border-2 shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Best for Long Runs</Badge>
                </div>
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">Long Running</CardTitle>
                  <CardDescription>Shows over 6 months</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-primary">
                      $400
                      <span className="text-lg font-normal text-muted-foreground">
                        + $100/mo
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Activation + monthly after 6 months
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      14-day free trial
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {showBillingFeatures.longRunning.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      {showBillingFeatures.common.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 mb-2">
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    size="lg"
                    onClick={() => user ? navigate('/onboarding') : navigate('/auth?mode=signup&from=pricing')}
                  >
                    {user ? 'Create Your First Show' : 'Start Free Trial'}
                  </Button>
                </CardContent>
              </Card>

              {/* Month-to-Month Show */}
              <Card className="relative flex flex-col">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">Month-to-Month</CardTitle>
                  <CardDescription>Ongoing monthly billing</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-primary">
                      $110
                      <span className="text-lg font-normal text-muted-foreground">
                        /mo
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Per show, billed monthly
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      14-day free trial
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {showBillingFeatures.monthToMonth.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      {showBillingFeatures.common.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 mb-2">
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    size="lg"
                    variant="outline"
                    onClick={() => user ? navigate('/onboarding') : navigate('/auth?mode=signup&from=pricing')}
                  >
                    {user ? 'Create Your First Show' : 'Start Free Trial'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mb-12">
              <h2 className="text-2xl font-bold text-center mb-6">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Create Your Show</h3>
                  <p className="text-sm text-muted-foreground">Set up your show with dates and invite your team. Start with a 14-day free trial.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Pay When Ready</h3>
                  <p className="text-sm text-muted-foreground">After your trial, pay the $400 activation fee to continue. That's it for shows under 6 months.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Long Runs Add Monthly</h3>
                  <p className="text-sm text-muted-foreground">Shows running more than 6 months add $100/month billing. Close anytime to stop billing.</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8 text-sm text-muted-foreground">
              <p>All shows include a 14-day free trial. No credit card required to start.</p>
              <p className="mt-2">Unlimited team members per show. No per-seat charges.</p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-4xl mx-auto">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Plan Details</CardTitle>
                  <CardDescription>
                    {selectedPlan ? cleanPlanName(selectedPlan.name) : 'Selected Plan'}
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
                  planName={selectedPlan ? cleanPlanName(selectedPlan.name) : 'Selected Plan'}
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
      {!isLoggedIn && <PublicFooter />}
    </div>
  );
}
