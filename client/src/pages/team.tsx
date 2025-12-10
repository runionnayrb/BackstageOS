import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { UserPlus, Users, MoreVertical } from "lucide-react";
import { useState } from "react";
import { EditTeamMemberDialog } from "@/components/team/EditTeamMemberDialog";

export default function Team() {
  const [, setLocation] = useLocation();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Fetch team members for the selected project
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/projects", selectedProject === "all" ? null : selectedProject, "team-members"],
    enabled: selectedProject !== "all",
  });

  // If "all" is selected, fetch team members from all projects
  const { data: allProjectTeamMembers = [] } = useQuery({
    queryKey: ["/api/projects", "all", "team-members"],
    enabled: selectedProject === "all",
    queryFn: async () => {
      // Fetch team members from all projects
      const members: any[] = [];
      for (const project of projects) {
        try {
          const response = await fetch(`/api/projects/${project.id}/team-members`);
          if (response.ok) {
            const projectMembers = await response.json();
            members.push(...projectMembers);
          }
        } catch (error) {
          console.error(`Failed to fetch team members for project ${project.id}:`, error);
        }
      }
      return members;
    },
  });

  const displayedMembers = selectedProject === "all" ? allProjectTeamMembers : teamMembers;

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "stage manager": return "bg-primary";
      case "director": return "bg-secondary";
      case "sound designer": return "bg-green-600";
      case "lighting designer": return "bg-yellow-600";
      case "costume designer": return "bg-purple-600";
      default: return "bg-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "declined": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Members</h2>
          <p className="text-gray-600">Manage your production team and their roles</p>
        </div>
        <Button onClick={() => setLocation("/invitations")}>
          <UserPlus className="w-5 h-5 mr-2" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Current Team</CardTitle>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {displayedMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
              <p className="text-gray-500 mb-6">Start building your team by inviting members</p>
              <Button onClick={() => setLocation("/invitations")}>
                <UserPlus className="w-5 h-5 mr-2" />
                Invite First Member
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {displayedMembers.map((member) => (
                <div key={member.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {getInitials(member.name || "")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={`${getRoleColor(member.role)} text-white`}>
                      {member.role}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(member.status)} text-white border-0`}
                    >
                      {member.status}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditingMember(member);
                        setEditDialogOpen(true);
                      }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingMember && (
        <EditTeamMemberDialog
          teamMember={editingMember}
          projectId={editingMember.projectId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  );
}
