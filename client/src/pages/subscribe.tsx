import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ planType, planPrice }: { planType: string; planPrice: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/settings?subscription=success`,
      },
    });

    if (error) {
      toast({
        title: "Subscription Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Subscription Successful",
        description: "Welcome to BackstageOS! Your subscription is now active.",
      });
      // Navigate to dashboard after successful subscription
      navigate("/dashboard");
    }
    
    setIsProcessing(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Subscribe to BackstageOS
          <Badge variant="secondary" className="ml-2">
            {planType === 'annual' ? 'Save 18%' : 'Monthly'}
          </Badge>
        </CardTitle>
        <CardDescription>
          ${planType === 'annual' ? '97/mo billed annually' : '119/mo'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button 
            type="submit" 
            disabled={!stripe || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Start Subscription - $${planPrice}${planType === 'annual' ? '/year' : '/month'}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [planType, setPlanType] = useState("monthly");
  const [planPrice, setPlanPrice] = useState(119);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get plan details from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan') || 'monthly';
    
    let price = 119; // Default monthly
    if (plan === 'annual') {
      price = 1164; // Annual price
    } else if (plan === 'theatre') {
      price = 199; // Theatre plan price (example)
    }
    
    setPlanType(plan);
    setPlanPrice(price);

    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/get-or-create-subscription", {
      planType: plan
    })
      .then((res) => res.json())
      .then((data) => {
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
      })
      .catch((error) => {
        console.error('Error creating subscription:', error);
        toast({
          title: "Subscription Setup Failed",
          description: "Unable to initialize subscription. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  const planFeatures = [
    'Unlimited shows and projects',
    'Advanced reporting tools',
    'Team collaboration features',
    'Script and cue management',
    'Props and costume tracking',
    'Schedule management',
    'Email integration',
    'Priority support'
  ];

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Subscription Setup Required</h1>
          <p className="text-muted-foreground mb-8">
            We're still setting up subscription billing. Please contact support for access.
          </p>
          <Button onClick={() => window.location.href = '/settings'}>
            Return to Settings
          </Button>
        </div>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your BackstageOS Plan</h1>
          <p className="text-xl text-muted-foreground">
            Professional stage management tools for theater professionals
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Features List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
                <CardDescription>
                  Everything you need for professional stage management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {planFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Form */}
          <div>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm planType={planType} planPrice={planPrice} />
            </Elements>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>By subscribing, you agree to our Terms of Service and Privacy Policy.</p>
              <p className="mt-2">You can cancel your subscription at any time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}