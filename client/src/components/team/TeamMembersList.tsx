import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical, Mail, Shield, Eye, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: number;
  userId?: number;
  email: string;
  name?: string;
  role: string;
  roleType?: string;
  accessLevel: "editor" | "viewer";
  status: string;
  userName?: string;
  userLastName?: string;
  userEmail: string;
  invitedAt: string;
  joinedAt?: string;
  projectId: number;
}

interface TeamMembersListProps {
  accessLevel: "editor" | "viewer";
  isActive?: boolean;
}

export function TeamMembersList({ accessLevel, isActive = true }: TeamMembersListProps) {
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "team-members"],
    enabled: !!projectId && isActive,
  });

  const defaultRoles = [
    "Production Stage Manager",
    "Stage Manager",
    "Assistant Stage Manager",
    "Production Assistant",
  ];

  const roles = defaultRoles;

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest("DELETE", `/api/team-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "team-members"] });
      toast({
        title: "Team member removed",
        description: "The team member has been removed from the production.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      return apiRequest("PUT", `/api/team-members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "team-members"] });
      toast({
        title: "Role updated",
        description: "Team member role has been updated.",
      });
      setEditingMemberId(null);
      setSelectedRole("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  const filteredMembers = (teamMembers as TeamMember[]).filter((member: TeamMember) => member.accessLevel === accessLevel);

  const handleRemoveMember = (memberId: number) => {
    if (confirm("Are you sure you want to remove this team member?")) {
      removeTeamMemberMutation.mutate(memberId);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setSelectedRole(member.role);
  };

  const handleSaveRole = () => {
    if (editingMemberId && selectedRole) {
      updateTeamMemberMutation.mutate({ memberId: editingMemberId, role: selectedRole });
    }
  };

  const resendInvitationMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest("POST", `/api/team-members/${memberId}/resend-invitation`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "Invitation email has been resent to the team member.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    },
  });

  const handleResendInvitation = (memberId: number) => {
    resendInvitationMutation.mutate(memberId);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getAccessIcon = (level: string) => {
    switch (level) {
      case "editor":
        return <Edit3 className="w-3 h-3" />;
      case "viewer":
        return <Eye className="w-3 h-3" />;
      default:
        return <Shield className="w-3 h-3" />;
    }
  };

  const getAccessColor = (level: string) => {
    switch (level) {
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredMembers.length === 0) {
    return (
      <div className="text-center py-8">
        {accessLevel === "editor" ? (
          <>
            <Edit3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No editors invited yet</p>
            <p className="text-sm text-muted-foreground">
              Editors can create and modify production content
            </p>
          </>
        ) : (
          <>
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No viewers invited yet</p>
            <p className="text-sm text-muted-foreground">
              Viewers can only view production content, not edit
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {filteredMembers.map((member: TeamMember) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <Avatar>
                    <AvatarImage src={`https://avatar.vercel.sh/${member.userEmail}`} />
                    <AvatarFallback>
                      {member.name ? member.name.split(' ').map(n => n[0]).join('') : getInitials(member.userName, member.userLastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="font-medium">
                      {member.name || `${member.userName} ${member.userLastName}`.trim()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    {member.status === "joined" 
                      ? `Joined ${new Date(member.joinedAt!).toLocaleDateString()}`
                      : `Invited ${new Date(member.invitedAt).toLocaleDateString()}`
                    }
                  </p>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditMember(member)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResendInvitation(member.id)}>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Invitation
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove from Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editingMemberId !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingMemberId(null);
          setSelectedRole("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member Role</DialogTitle>
            <DialogDescription>
              Select a new production role for this team member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Production Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((roleName) => (
                    <SelectItem key={roleName} value={roleName}>
                      {roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setEditingMemberId(null);
                  setSelectedRole("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveRole}
                disabled={updateTeamMemberMutation.isPending}
              >
                {updateTeamMemberMutation.isPending ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}