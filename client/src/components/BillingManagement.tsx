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

interface ProfileType {
  id: number;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}



export default function BillingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<BillingPlan | null>(null);
  
  // Profile Types state
  const [isCreateProfileTypeOpen, setIsCreateProfileTypeOpen] = useState(false);
  const [isEditProfileTypeOpen, setIsEditProfileTypeOpen] = useState(false);
  const [editingProfileType, setEditingProfileType] = useState<ProfileType | null>(null);
  const [isDeleteProfileTypeDialogOpen, setIsDeleteProfileTypeDialogOpen] = useState(false);
  const [profileTypeToDelete, setProfileTypeToDelete] = useState<ProfileType | null>(null);



  // Fetch billing plans
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["/api/billing/plans"],
  });

  // Fetch profile types
  const { data: profileTypes = [], isLoading: profileTypesLoading } = useQuery<ProfileType[]>({
    queryKey: ["/api/admin/account-types"],
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

  // Profile Types mutations
  const createProfileTypeMutation = useMutation({
    mutationFn: (profileTypeData: any) => apiRequest("POST", "/api/admin/account-types", profileTypeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-types"] });
      setIsCreateProfileTypeOpen(false);
      toast({
        title: "Success",
        description: "Profile type created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile type",
        variant: "destructive",
      });
    },
  });

  const updateProfileTypeMutation = useMutation({
    mutationFn: ({ profileTypeId, profileTypeData }: { profileTypeId: number; profileTypeData: any }) => 
      apiRequest("PUT", `/api/admin/account-types/${profileTypeId}`, profileTypeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-types"] });
      setIsEditProfileTypeOpen(false);
      setEditingProfileType(null);
      toast({
        title: "Success",
        description: "Profile type updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile type",
        variant: "destructive",
      });
    },
  });

  const deleteProfileTypeMutation = useMutation({
    mutationFn: (profileTypeId: number) => apiRequest("DELETE", `/api/admin/account-types/${profileTypeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-types"] });
      toast({
        title: "Success",
        description: "Profile type deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile type",
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

  // Profile Types handlers
  const handleCreateProfileType = (formData: FormData) => {
    const profileTypeData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
      isActive: formData.get("isActive") === "on",
    };
    
    createProfileTypeMutation.mutate(profileTypeData);
  };

  const openEditProfileTypeDialog = (profileType: ProfileType) => {
    setEditingProfileType(profileType);
    setIsEditProfileTypeOpen(true);
  };

  const handleUpdateProfileType = (formData: FormData) => {
    if (editingProfileType) {
      const profileTypeData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        sortOrder: parseInt(formData.get("sortOrder") as string),
        isActive: formData.get("isActive") === "on",
      };
      
      updateProfileTypeMutation.mutate({
        profileTypeId: editingProfileType.id,
        profileTypeData,
      });
    }
  };

  const handleDeleteProfileType = (profileType: ProfileType) => {
    setProfileTypeToDelete(profileType);
    setIsDeleteProfileTypeDialogOpen(true);
  };

  const confirmDeleteProfileType = () => {
    if (profileTypeToDelete) {
      deleteProfileTypeMutation.mutate(profileTypeToDelete.id);
      setIsDeleteProfileTypeDialogOpen(false);
      setProfileTypeToDelete(null);
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
          <h2 className="text-2xl font-bold tracking-tight">Billing Management</h2>
          <p className="text-muted-foreground">Manage billing plans and profile types</p>
        </div>
      </div>

      <Tabs defaultValue="billing-plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="billing-plans">Billing Plans</TabsTrigger>
          <TabsTrigger value="account-types">Profile Types</TabsTrigger>
        </TabsList>

        <TabsContent value="billing-plans" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Billing Plans</h3>
              <p className="text-sm text-muted-foreground">Manage subscription plans and pricing</p>
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
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">$</span>
                    </div>
                    <Input id="price" name="price" type="number" step="0.01" placeholder="1,199.00" className="pl-8" required />
                  </div>
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
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">$</span>
                  </div>
                  <Input 
                    id="edit-price" 
                    name="price" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingPlan?.price || ""}
                    placeholder="1,199.00"
                    className="pl-8"
                    required 
                  />
                </div>
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
        </TabsContent>

        <TabsContent value="account-types" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Profile Types</h3>
              <p className="text-sm text-muted-foreground">Organize billing plans by user category</p>
            </div>
            <Dialog open={isCreateProfileTypeOpen} onOpenChange={setIsCreateProfileTypeOpen}>
              <DialogTrigger asChild>
                <Button>Create Profile Type</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Profile Type</DialogTitle>
                  <DialogDescription>Create a new profile type category for billing plans</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateProfileType(formData);
                }}>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="accountTypeName">Type Name</Label>
                      <Input id="accountTypeName" name="name" placeholder="Professional" required />
                    </div>
                    <div>
                      <Label htmlFor="accountTypeDescription">Description</Label>
                      <Textarea id="accountTypeDescription" name="description" placeholder="Professional theater organizations" />
                    </div>
                    <div>
                      <Label htmlFor="accountTypeSortOrder">Sort Order</Label>
                      <Input id="accountTypeSortOrder" name="sortOrder" type="number" defaultValue="1" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="accountTypeIsActive" name="isActive" defaultChecked />
                      <Label htmlFor="accountTypeIsActive">Active Type</Label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateProfileTypeOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProfileTypeMutation.isPending}>
                      {createProfileTypeMutation.isPending ? "Creating..." : "Create Type"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Profile Type Dialog */}
          <Dialog open={isEditProfileTypeOpen} onOpenChange={setIsEditProfileTypeOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Profile Type</DialogTitle>
                <DialogDescription>Update profile type information</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateProfileType(formData);
              }}>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="editAccountTypeName">Type Name</Label>
                    <Input 
                      id="editAccountTypeName" 
                      name="name" 
                      defaultValue={editingProfileType?.name || ""} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="editAccountTypeDescription">Description</Label>
                    <Textarea 
                      id="editAccountTypeDescription" 
                      name="description" 
                      defaultValue={editingProfileType?.description || ""} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="editAccountTypeSortOrder">Sort Order</Label>
                    <Input 
                      id="editAccountTypeSortOrder" 
                      name="sortOrder" 
                      type="number" 
                      defaultValue={editingProfileType?.sortOrder || 1} 
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="editAccountTypeIsActive" 
                      name="isActive" 
                      defaultChecked={editingProfileType?.isActive} 
                    />
                    <Label htmlFor="editAccountTypeIsActive">Active Type</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditProfileTypeOpen(false);
                      setEditingProfileType(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProfileTypeMutation.isPending}>
                    {updateProfileTypeMutation.isPending ? "Updating..." : "Update Type"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="space-y-4">
            {profileTypesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profileTypes.map((profileType: ProfileType) => (
                  <Card key={profileType.id} className={!profileType.isActive ? "opacity-60" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{profileType.name}</CardTitle>
                        <Badge variant={profileType.isActive ? "default" : "secondary"}>
                          {profileType.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {profileType.description && (
                        <p className="text-sm text-muted-foreground">{profileType.description}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openEditProfileTypeDialog(profileType)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteProfileType(profileType)}
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

          {/* Profile Type Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteProfileTypeDialogOpen} onOpenChange={setIsDeleteProfileTypeDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Profile Type</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the profile type "{profileTypeToDelete?.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setIsDeleteProfileTypeDialogOpen(false);
                  setProfileTypeToDelete(null);
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDeleteProfileType}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteProfileTypeMutation.isPending}
                >
                  {deleteProfileTypeMutation.isPending ? "Deleting..." : "Delete Type"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}