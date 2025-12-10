import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

const editTeamMemberSchema = z.object({
  name: z.string().min(1, "Please enter their name"),
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Please select a role"),
});

type EditTeamMemberForm = z.infer<typeof editTeamMemberSchema>;

interface EditTeamMemberDialogProps {
  teamMember: any;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeamMemberDialog({
  teamMember,
  projectId,
  open,
  onOpenChange,
}: EditTeamMemberDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project settings to get custom roles
  const { data: settings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  const defaultRoles = [
    "Production Stage Manager",
    "Stage Manager",
    "Assistant Stage Manager",
    "Production Assistant",
  ];

  const roles = settings?.teamRoles?.map((r: any) => r.name) || defaultRoles;

  const form = useForm<EditTeamMemberForm>({
    resolver: zodResolver(editTeamMemberSchema),
    defaultValues: {
      name: teamMember.name || "",
      email: teamMember.email || "",
      role: teamMember.role || "Production Assistant",
    },
  });

  const editTeamMemberMutation = useMutation({
    mutationFn: async (data: EditTeamMemberForm) => {
      return apiRequest("PUT", `/api/team-members/${teamMember.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "team-members"] });
      toast({
        title: "Team member updated",
        description: "Changes have been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTeamMemberForm) => {
    editTeamMemberMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update the team member's name, email, and role.
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={editTeamMemberMutation.isPending}
              >
                {editTeamMemberMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
