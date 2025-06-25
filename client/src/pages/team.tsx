import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { UserPlus, Users, MoreVertical } from "lucide-react";
import { useState } from "react";

export default function Team() {
  const [, setLocation] = useLocation();
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Mock team data since we don't have team member endpoints implemented
  const mockTeamMembers = [
    {
      id: 1,
      name: "Jane Smith",
      email: "jane@email.com",
      role: "Stage Manager",
      status: "accepted",
      initials: "JS",
    },
    {
      id: 2,
      name: "Mike Davis",
      email: "mike@email.com",
      role: "Director",
      status: "accepted",
      initials: "MD",
    },
    {
      id: 3,
      name: "Lisa Johnson",
      email: "lisa@email.com",
      role: "Sound Designer",
      status: "pending",
      initials: "LJ",
    },
  ];

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
          {mockTeamMembers.length === 0 ? (
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
              {mockTeamMembers.map((member) => (
                <div key={member.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {member.initials}
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
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
