import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Mail, Shield, Eye, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: number;
  userId: number;
  email: string;
  role: string;
  roleType: string;
  accessLevel: "editor" | "viewer";
  status: string;
  userName: string;
  userLastName: string;
  userEmail: string;
  invitedAt: string;
  joinedAt?: string;
}

interface TeamMembersListProps {
  accessLevel: "editor" | "viewer";
  isActive?: boolean;
}

export function TeamMembersList({ accessLevel, isActive = true }: TeamMembersListProps) {
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "team-members"],
    enabled: !!projectId && isActive,
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest(`/api/team-members/${memberId}`, {
        method: "DELETE",
      });
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

  const filteredMembers = teamMembers.filter(member => member.accessLevel === accessLevel);

  const handleRemoveMember = (memberId: number) => {
    if (confirm("Are you sure you want to remove this team member?")) {
      removeTeamMemberMutation.mutate(memberId);
    }
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
    <div className="space-y-3">
      {filteredMembers.map((member) => (
        <Card key={member.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={`https://avatar.vercel.sh/${member.userEmail}`} />
                  <AvatarFallback>
                    {getInitials(member.userName, member.userLastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">
                      {member.userName} {member.userLastName}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getAccessColor(member.accessLevel)}`}
                    >
                      {getAccessIcon(member.accessLevel)}
                      <span className="ml-1 capitalize">{member.accessLevel}</span>
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>{member.userEmail}</span>
                    </span>
                    <span>{member.role}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {member.status === "joined" 
                      ? `Joined ${new Date(member.joinedAt!).toLocaleDateString()}`
                      : `Invited ${new Date(member.invitedAt).toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Invitation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from Production
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}