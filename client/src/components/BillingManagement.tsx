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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Trash2 } from "lucide-react";

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



export default function BillingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<BillingPlan | null>(null);



  // Fetch billing plans
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["/api/billing/plans"],
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

  // Update billing plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, planData }: { planId: number; planData: any }) => 
      apiRequest("PUT", `/api/admin/billing/plans/${planId}`, planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
      setIsEditPlanOpen(false);
      setEditingPlan(null);
      toast({
        title: "Success",
        description: "Billing plan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update billing plan",
        variant: "destructive",
      });
    },
  });

  // Delete billing plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (planId: number) => apiRequest("DELETE", `/api/admin/billing/plans/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
      toast({
        title: "Success",
        description: "Billing plan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete billing plan",
        variant: "destructive",
      });
    },
  });



  // Auto-generate planId from name
  const generatePlanId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')         // Spaces to hyphens
      .replace(/-+/g, '-')          // Multiple hyphens to single
      .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
  };

  const handleCreatePlan = (formData: FormData) => {
    const name = formData.get("name") as string;
    const planData = {
      planId: generatePlanId(name),
      name: name,
      price: parseFloat(formData.get("price") as string),
      billingInterval: formData.get("billingInterval") as string,
      trialDays: parseInt(formData.get("trialDays") as string),
      maxProjects: formData.get("maxProjects") ? parseInt(formData.get("maxProjects") as string) : null,
      maxTeamMembers: formData.get("maxTeamMembers") ? parseInt(formData.get("maxTeamMembers") as string) : null,
      isActive: formData.get("isActive") === "on",
      sortOrder: parseInt(formData.get("sortOrder") as string),
    };

    createPlanMutation.mutate(planData);
  };

  const handleEditPlan = (formData: FormData) => {
    if (!editingPlan) return;

    const name = formData.get("name") as string;
    const planData = {
      planId: generatePlanId(name),
      name: name,
      price: parseFloat(formData.get("price") as string),
      billingInterval: formData.get("billingInterval") as string,
      trialDays: parseInt(formData.get("trialDays") as string),
      maxProjects: formData.get("maxProjects") ? parseInt(formData.get("maxProjects") as string) : null,
      maxTeamMembers: formData.get("maxTeamMembers") ? parseInt(formData.get("maxTeamMembers") as string) : null,
      isActive: formData.get("isActive") === "on",
      sortOrder: parseInt(formData.get("sortOrder") as string),
    };

    updatePlanMutation.mutate({ planId: editingPlan.id, planData });
  };

  const handleDeletePlan = (plan: BillingPlan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePlan = () => {
    if (planToDelete) {
      deletePlanMutation.mutate(planToDelete.id);
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const openEditDialog = (plan: BillingPlan) => {
    setEditingPlan(plan);
    setIsEditPlanOpen(true);
  };



  const formatPrice = (price: number | string, interval: string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (interval === "year") {
      const monthlyEquivalent = Math.round(numPrice / 12);
      return `$${monthlyEquivalent.toLocaleString()}/mo (billed annually at $${numPrice.toLocaleString()})`;
    }
    return `$${numPrice.toLocaleString()}/mo`;
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing Plan Management</h2>
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
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreatePlan(formData);
            }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" name="name" placeholder="Monthly Standard" required />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" type="number" step="0.01" placeholder="1,199.00" required />
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

      {/* Edit Plan Dialog */}
      <Dialog open={isEditPlanOpen} onOpenChange={setIsEditPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Billing Plan</DialogTitle>
            <DialogDescription>Update the subscription plan details</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleEditPlan(formData);
          }}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label htmlFor="edit-name">Plan Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingPlan?.name || ""}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Price</Label>
                <Input 
                  id="edit-price" 
                  name="price" 
                  type="number" 
                  step="0.01" 
                  defaultValue={editingPlan?.price || ""}
                  placeholder="1,199.00"
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-billingInterval">Billing Interval</Label>
                <Select name="billingInterval" defaultValue={editingPlan?.billingInterval || ""}>
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
                <Label htmlFor="edit-trialDays">Trial Days</Label>
                <Input 
                  id="edit-trialDays" 
                  name="trialDays" 
                  type="number" 
                  defaultValue={editingPlan?.trialDays || "30"}
                />
              </div>
              <div>
                <Label htmlFor="edit-sortOrder">Sort Order</Label>
                <Input 
                  id="edit-sortOrder" 
                  name="sortOrder" 
                  type="number" 
                  defaultValue={editingPlan?.sortOrder || "1"}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="edit-isActive" 
                  name="isActive" 
                  defaultChecked={editingPlan?.isActive || false}
                />
                <Label htmlFor="edit-isActive">Active Plan</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditPlanOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePlanMutation.isPending}>
                Update Plan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(plan.price, plan.billingInterval)}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {plan.trialDays}-day trial included
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditDialog(plan)}
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeletePlan(plan)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the billing plan "{planToDelete?.name}"? This action cannot be undone and will affect any users currently subscribed to this plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setPlanToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePlan}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}