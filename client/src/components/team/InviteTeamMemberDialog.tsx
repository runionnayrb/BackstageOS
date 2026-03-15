import React, { useState } from "react";
import { useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Eye, AlertTriangle, Shield } from "lucide-react";

const inviteTeamMemberSchema = z.object({
  name: z.string().min(1, "Please enter their name"),
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Please select a role"),
  roleType: z.string().default("production"),
  accessLevel: z.enum(["editor", "viewer"]),
});

type InviteTeamMemberForm = z.infer<typeof inviteTeamMemberSchema>;

interface InviteTeamMemberDialogProps {
  variant: "editor" | "viewer";
  trigger?: React.ReactNode;
}

export function InviteTeamMemberDialog({ variant, trigger }: InviteTeamMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project settings to get custom roles
  const { data: settings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  // Fetch editor count for this project
  const { data: editorCountData } = useQuery({
    queryKey: [`/api/projects/${projectId}/editor-count`],
    enabled: !!projectId && variant === "editor",
  });

  // Get default roles if no custom roles exist
  const defaultRoles = [
    "Production Stage Manager",
    "Stage Manager",
    "Assistant Stage Manager",
    "Production Assistant",
  ];

  const roles = settings?.teamRoles?.map((r: any) => r.name) || defaultRoles;

  const form = useForm<InviteTeamMemberForm>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "Production Assistant",
      roleType: "production",
      accessLevel: variant,
    },
  });

  // Check editor limits when email is provided and variant is editor
  const checkLimitsMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      return await apiRequest('POST', '/api/admin/check-editor-limits', { email, name });
    },
  });

  const emailValue = form.watch("email");
  
  // Trigger limits check when email changes and variant is editor
  React.useEffect(() => {
    if (variant === "editor" && emailValue && emailValue.includes('@')) {
      checkLimitsMutation.mutate({ email: emailValue, name: "" });
    }
  }, [emailValue, variant]);

  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (data: InviteTeamMemberForm) => {
      return apiRequest("POST", `/api/projects/${projectId}/team-members`, data);
    },
    onMutate: async (data: InviteTeamMemberForm) => {
      // Cancel outgoing refetches to avoid overwriting optimistic updates
      await queryClient.cancelQueries({ queryKey: ["/api/projects", projectId, "team-members"] });
      
      // Snapshot previous data
      const previousTeamMembers = queryClient.getQueryData(["/api/projects", projectId, "team-members"]);
      
      // Optimistically update cache with new team member
      queryClient.setQueryData(["/api/projects", projectId, "team-members"], (old: any[] = []) => [
        ...old,
        {
          id: Math.random(), // Temporary ID
          projectId: parseInt(projectId),
          name: data.name,
          email: data.email,
          role: data.role,
          roleType: data.roleType,
          accessLevel: data.accessLevel,
          status: "pending",
          userName: "",
          userLastName: "",
          userEmail: data.email,
          invitedAt: new Date().toISOString(),
        },
      ]);
      
      return { previousTeamMembers };
    },
    onSuccess: () => {
      // Refetch to get the real data from server
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "team-members"] });
      toast({
        title: "Team member invited",
        description: `${variant === "editor" ? "Editor" : "Viewer"} has been invited to the production.`,
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous data on error
      if (context?.previousTeamMembers) {
        queryClient.setQueryData(["/api/projects", projectId, "team-members"], context.previousTeamMembers);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to invite team member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteTeamMemberForm) => {
    // For editors, check limits before submitting
    if (variant === "editor" && !checkLimitsMutation.data?.canInvite) {
      toast({
        title: "Cannot invite editor",
        description: "Editor limits exceeded or duplicate detected. Please check the warnings above.",
        variant: "destructive",
      });
      return;
    }
    
    inviteTeamMemberMutation.mutate(data);
  };

  const limitsData = checkLimitsMutation.data;
  const showLimitWarning = variant === "editor" && limitsData && !limitsData.canInvite;



  const defaultTrigger = variant === "editor" ? (
    <Button>
      <UserPlus className="w-4 h-4 mr-2" />
      Invite Editor
    </Button>
  ) : (
    <Button variant="outline">
      <Eye className="w-4 h-4 mr-2" />
      Invite Viewer
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Invite {variant === "editor" ? "Editor" : "Viewer"}
          </DialogTitle>
          <DialogDescription>
            {variant === "editor" 
              ? "Invite a team member with editing permissions. Editors can create and modify production content."
              : "Invite a team member with view-only access. Viewers can see production information but cannot edit."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Bryan Runion" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter email address" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Production Role</FormLabel>
                  {variant === "viewer" ? (
                    <FormControl>
                      <Input 
                        placeholder="e.g., Guest Designer, Observer" 
                        {...field} 
                      />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((roleName: string) => (
                          <SelectItem key={roleName} value={roleName}>
                            {roleName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Editor Limits Info */}
            {variant === "editor" && editorCountData && (
              <Alert className={editorCountData.editorCount >= editorCountData.maxEditors ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Current editors assigned: <span className="font-semibold">{editorCountData.editorCount}/{editorCountData.maxEditors}</span>
                  {editorCountData.editorCount >= editorCountData.maxEditors && (
                    <div className="text-red-700 font-semibold mt-1">Maximum editor limit reached. Please remove an editor before inviting a new one.</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Editor Limits Warning */}
            {variant === "editor" && emailValue && checkLimitsMutation.isLoading && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Checking editor limits and duplicate protection...
                </AlertDescription>
              </Alert>
            )}

            {showLimitWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {limitsData?.limitReached && (
                    <div>Editor already assigned to maximum 2 active shows ({limitsData.activeShowCount} shows).</div>
                  )}
                  {limitsData?.duplicateCheck?.duplicate && (
                    <div>
                      Duplicate editor detected: {limitsData.duplicateCheck.type}. 
                      Existing: {limitsData.duplicateCheck.existingMember?.name} ({limitsData.duplicateCheck.existingMember?.email})
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {variant === "editor" && limitsData?.canInvite && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  ✓ Editor can be invited ({limitsData.activeShowCount}/2 shows assigned)
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={inviteTeamMemberMutation.isPending || showLimitWarning || (variant === "editor" && editorCountData?.editorCount >= editorCountData?.maxEditors)}
              >
                {inviteTeamMemberMutation.isPending ? "Inviting..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}