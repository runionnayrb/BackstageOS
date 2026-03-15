import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard, DollarSign, Users, TrendingUp, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
  defaultPriceId: string | null;
  prices: {
    id: string;
    unitAmount: number | null;
    currency: string;
    interval: string | null;
    intervalCount: number | null;
    trialPeriodDays: number | null;
    active: boolean;
    metadata: Record<string, string>;
  }[];
}

interface StripeAnalytics {
  activeSubscriptions: number;
  mrr: number;
  recentInvoices: {
    id: string;
    customerEmail: string | null;
    amount: number;
    status: string | null;
    created: string;
  }[];
}

interface BillingModeResponse {
  mode: 'beta' | 'live';
  description: string;
}

export default function BillingManagement() {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<'beta' | 'live' | null>(null);
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(30);

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/user-analytics"],
  });

  const { data: stripeProducts, isLoading: productsLoading, refetch: refetchProducts } = useQuery<{ products: StripeProduct[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<StripeAnalytics>({
    queryKey: ["/api/admin/stripe/analytics"],
  });

  const { data: billingMode, isLoading: billingModeLoading, refetch: refetchBillingMode } = useQuery<BillingModeResponse>({
    queryKey: ["/api/admin/billing-mode"],
  });

  const updateBillingModeMutation = useMutation({
    mutationFn: async ({ mode, gracePeriodDays }: { mode: 'beta' | 'live'; gracePeriodDays?: number }) => {
      const response = await apiRequest("POST", "/api/admin/billing-mode", { 
        mode, 
        gracePeriodDays: mode === 'live' ? gracePeriodDays : undefined 
      });
      return response;
    },
    onMutate: async ({ mode }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/billing-mode"] });
      const previousMode = queryClient.getQueryData<BillingModeResponse>(["/api/admin/billing-mode"]);
      queryClient.setQueryData(["/api/admin/billing-mode"], {
        mode,
        description: mode === 'live' 
          ? 'Live mode - New users must pay to access features'
          : 'Beta mode - New users get free access without payment',
      });
      return { previousMode };
    },
    onSuccess: (data: any, { mode, gracePeriodDays }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing-mode"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-analytics"] });
      toast({
        title: mode === 'live' ? "Live Billing Enabled" : "Beta Mode Enabled",
        description: mode === 'live' && data?.usersUpdated > 0
          ? `${data.usersUpdated} beta users given ${gracePeriodDays} day grace period.`
          : mode === 'live' 
            ? "New users will now be required to pay. All user statuses updated."
            : "New users will get free access. All user statuses updated.",
      });
    },
    onError: (error: any, _, context) => {
      if (context?.previousMode) {
        queryClient.setQueryData(["/api/admin/billing-mode"], context.previousMode);
      }
      toast({
        title: "Failed to update billing mode",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (amount: number | null, currency: string, interval: string | null) => {
    if (amount === null) return "Custom pricing";
    const price = amount / 100;
    const intervalLabel = interval === "year" ? "/year" : "/month";
    return `$${price.toLocaleString()}${intervalLabel}`;
  };

  const handleRefresh = () => {
    refetchProducts();
    refetchAnalytics();
    refetchBillingMode();
  };

  const openStripeDashboard = () => {
    window.open("https://dashboard.stripe.com", "_blank");
  };

  const handleBillingModeToggle = (checked: boolean) => {
    const newMode = checked ? 'live' : 'beta';
    if (newMode === 'live') {
      setPendingMode('live');
      setShowConfirmDialog(true);
    } else {
      updateBillingModeMutation.mutate({ mode: 'beta' });
    }
  };

  const confirmBillingModeChange = () => {
    if (pendingMode) {
      updateBillingModeMutation.mutate({ mode: pendingMode, gracePeriodDays });
    }
    setShowConfirmDialog(false);
    setPendingMode(null);
  };

  const isLiveMode = billingMode?.mode === 'live';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Billing Dashboard</h2>
          <p className="text-muted-foreground">View billing data from Stripe. Manage products and subscriptions in Stripe Dashboard.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
            <div className="flex flex-col">
              <Label htmlFor="billing-mode" className="text-sm font-medium">
                {billingModeLoading ? "Loading..." : (isLiveMode ? "Live Billing" : "Beta Mode")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {isLiveMode ? "Users must pay" : "Free access"}
              </span>
            </div>
            <Switch
              id="billing-mode"
              checked={isLiveMode}
              onCheckedChange={handleBillingModeToggle}
              disabled={billingModeLoading || updateBillingModeMutation.isPending}
              className={isLiveMode ? "data-[state=checked]:bg-green-600" : ""}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openStripeDashboard}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Stripe Dashboard
          </Button>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Enable Live Billing?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>This will switch from beta mode to live billing. Here's what will happen:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>New users will be required to pay for access</li>
                  <li>All user statuses will be recalculated instantly</li>
                </ul>
                
                <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                  <Label htmlFor="grace-period" className="text-sm font-medium text-foreground">
                    Grace Period for Existing Beta Users
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Set how many days existing beta users can continue using the app for free before they need to subscribe.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      id="grace-period"
                      type="number"
                      min="0"
                      max="365"
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
                
                <p className="font-medium text-foreground">Are you sure you want to enable live billing?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBillingModeChange} className="bg-green-600 hover:bg-green-700">
              Enable Live Billing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {analytics?.activeSubscriptions || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                ${(analytics?.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {users.filter(u => u.subscriptionStatus === 'trialing').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => u.subscriptionStatus === 'past_due').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Products & Pricing
            </CardTitle>
            <CardDescription>
              Products and prices from your Stripe account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : stripeProducts?.products?.length ? (
              <div className="space-y-4">
                {stripeProducts.products.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{product.name}</h4>
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {product.prices.map((price) => (
                        <Badge key={price.id} variant="outline" className="text-xs">
                          {formatPrice(price.unitAmount, price.currency, price.interval)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No products found in Stripe.</p>
                <Button variant="link" onClick={openStripeDashboard} className="mt-2">
                  Create products in Stripe Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Latest payment activity from Stripe
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : analytics?.recentInvoices?.length ? (
              <div className="space-y-3">
                {analytics.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{invoice.customerEmail || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.created).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${invoice.amount.toFixed(2)}</span>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent invoices found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Status by User</CardTitle>
          <CardDescription>
            Overview of user subscription statuses from your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.subscriptionStatus === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.subscriptionStatus === 'trialing').length}
              </div>
              <div className="text-sm text-muted-foreground">Trialing</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.subscriptionStatus === 'past_due').length}
              </div>
              <div className="text-sm text-muted-foreground">Past Due</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {users.filter(u => u.subscriptionStatus === 'canceled').length}
              </div>
              <div className="text-sm text-muted-foreground">Canceled</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => !u.subscriptionStatus || u.subscriptionStatus === 'none').length}
              </div>
              <div className="text-sm text-muted-foreground">Free/None</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
