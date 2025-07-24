import { useState } from "react";
import { useParams } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Eye } from "lucide-react";

const inviteTeamMemberSchema = z.object({
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

  const form = useForm<InviteTeamMemberForm>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      email: "",
      role: "Production Assistant",
      roleType: "production",
      accessLevel: variant,
    },
  });

  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (data: InviteTeamMemberForm) => {
      return apiRequest(`/api/projects/${projectId}/team-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/team-members`] });
      toast({
        title: "Team member invited",
        description: `${variant === "editor" ? "Editor" : "Viewer"} has been invited to the production.`,
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite team member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteTeamMemberForm) => {
    inviteTeamMemberMutation.mutate(data);
  };

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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Production Stage Manager">Production Stage Manager</SelectItem>
                      <SelectItem value="Stage Manager">Stage Manager</SelectItem>
                      <SelectItem value="Production Assistant">Production Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={inviteTeamMemberMutation.isPending}
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