import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
}

interface BillingHistory {
  id: number;
  userId: number;
  planId: string;
  action: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  createdAt: string;
}

interface PaymentMethod {
  id: number;
  userId: number;
  type: string;
  cardLastFour?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface User {
  id: number;
  email: string;
  username: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  paymentMethodRequired?: boolean;
  grandfatheredFree?: boolean;
}

export default function BillingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

  // Fetch billing plans
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["/api/billing/plans"],
  });

  // Fetch users for subscription management
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Create billing plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (planData: any) => apiRequest("POST", "/api/admin/billing/plans", planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
      setIsCreatePlanOpen(false);
      toast({
        title: "Success",
        description: "Billing plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create billing plan",
        variant: "destructive",
      });
    },
  });

  // Update user subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: (data: { userId: number; subscriptionData: any }) =>
      apiRequest("PUT", `/api/admin/users/${data.userId}/subscription`, data.subscriptionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User subscription updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = (formData: FormData) => {
    const planData = {
      planId: formData.get("planId") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseFloat(formData.get("price") as string),
      billingInterval: formData.get("billingInterval") as string,
      trialDays: parseInt(formData.get("trialDays") as string),
      features: JSON.parse(formData.get("features") as string || "[]"),
      maxProjects: formData.get("maxProjects") ? parseInt(formData.get("maxProjects") as string) : null,
      maxTeamMembers: formData.get("maxTeamMembers") ? parseInt(formData.get("maxTeamMembers") as string) : null,
      isActive: formData.get("isActive") === "on",
      sortOrder: parseInt(formData.get("sortOrder") as string),
    };

    createPlanMutation.mutate(planData);
  };

  const handleUpdateUserSubscription = (userId: number, subscriptionData: any) => {
    updateSubscriptionMutation.mutate({ userId, subscriptionData });
  };

  const formatPrice = (price: number, interval: string) => {
    return `$${price}/${interval === "month" ? "mo" : "yr"}`;
  };

  const getSubscriptionStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Free</Badge>;
    
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "trialing":
        return <Badge variant="outline">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing Management</h2>
          <p className="text-muted-foreground">Manage subscription plans and user billing</p>
        </div>
        <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
          <DialogTrigger asChild>
            <Button>Create New Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Billing Plan</DialogTitle>
              <DialogDescription>Create a new subscription plan for users</DialogDescription>
            </DialogHeader>
            <form action={handleCreatePlan}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <Label htmlFor="planId">Plan ID</Label>
                  <Input id="planId" name="planId" placeholder="monthly-standard" required />
                </div>
                <div>
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" name="name" placeholder="Monthly Standard" required />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Plan description" />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" type="number" step="0.01" placeholder="119.00" required />
                </div>
                <div>
                  <Label htmlFor="billingInterval">Billing Interval</Label>
                  <Select name="billingInterval" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trialDays">Trial Days</Label>
                  <Input id="trialDays" name="trialDays" type="number" defaultValue="30" />
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input id="sortOrder" name="sortOrder" type="number" defaultValue="1" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="features">Features (JSON Array)</Label>
                  <Textarea 
                    id="features" 
                    name="features" 
                    placeholder='["reports", "calendar", "script"]'
                    defaultValue='["reports", "calendar", "script", "props", "contacts"]'
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="isActive" name="isActive" defaultChecked />
                  <Label htmlFor="isActive">Active Plan</Label>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreatePlanOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPlanMutation.isPending}>
                  Create Plan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Billing Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">User Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {plansLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {billingPlans.map((plan: BillingPlan) => (
                <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{plan.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(plan.price, plan.billingInterval)}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {plan.trialDays}-day trial included
                      </p>
                      {plan.features && plan.features.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {plan.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          {usersLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user: User) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">{user.username || user.email}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getSubscriptionStatusBadge(user.subscriptionStatus)}
                            {user.subscriptionPlan && (
                              <Badge variant="outline">{user.subscriptionPlan}</Badge>
                            )}
                            {user.grandfatheredFree && (
                              <Badge variant="secondary">Grandfathered</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">Subscription Details</h4>
                              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <p>Status: {user.subscriptionStatus || "Free"}</p>
                                <p>Plan: {user.subscriptionPlan || "None"}</p>
                                {user.trialEndsAt && (
                                  <p>Trial Ends: {new Date(user.trialEndsAt).toLocaleDateString()}</p>
                                )}
                                {user.subscriptionEndsAt && (
                                  <p>Subscription Ends: {new Date(user.subscriptionEndsAt).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <Label>Update Subscription</Label>
                              <Select 
                                onValueChange={(value) => {
                                  if (value === "cancel") {
                                    handleUpdateUserSubscription(user.id, {
                                      subscriptionStatus: "canceled",
                                      subscriptionEndsAt: new Date()
                                    });
                                  } else if (value === "grandfathered") {
                                    handleUpdateUserSubscription(user.id, {
                                      grandfatheredFree: true,
                                      subscriptionStatus: "active",
                                      subscriptionPlan: "free"
                                    });
                                  } else {
                                    handleUpdateUserSubscription(user.id, {
                                      subscriptionPlan: value,
                                      subscriptionStatus: "active"
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                                <SelectContent>
                                  {billingPlans.map((plan: BillingPlan) => (
                                    <SelectItem key={plan.planId} value={plan.planId}>
                                      Set to {plan.name}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="grandfathered">Grant Free Access</SelectItem>
                                  <SelectItem value="cancel">Cancel Subscription</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}