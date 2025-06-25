import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const invitationSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().optional(),
  projectId: z.string().min(1, "Project is required"),
  role: z.string().min(1, "Role is required"),
  message: z.string().optional(),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

export default function Invitations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      name: "",
      projectId: "",
      role: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InvitationFormData) => {
      await apiRequest("POST", `/api/projects/${data.projectId}/team`, {
        email: data.email,
        name: data.name,
        role: data.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Invitation Sent",
        description: "Team member invitation has been sent successfully!",
      });
      form.reset();
      setLocation("/team");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvitationFormData) => {
    mutation.mutate(data);
  };

  const roles = [
    "Stage Manager",
    "Assistant Stage Manager",
    "Director",
    "Assistant Director",
    "Set Designer",
    "Costume Designer",
    "Lighting Designer",
    "Sound Designer",
    "Technical Director",
    "Props Master",
    "Crew Member",
    "Producer",
    "Other",
  ];

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invite Team Member</h2>
          <p className="text-gray-600">Add new members to your production team</p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="member@email.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    {...form.register("name")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="project">Project *</Label>
                <Select onValueChange={(value) => form.setValue("projectId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.projectId && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.projectId.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select onValueChange={(value) => form.setValue("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.role.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  rows={3}
                  placeholder="Add a personal message to the invitation..."
                  {...form.register("message")}
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/team")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
