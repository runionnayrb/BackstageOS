import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Calendar, MapPin, Users, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ArchivedProject {
  id: number;
  name: string;
  description?: string;
  venue?: string;
  openingNight?: string;
  closingDate?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ArchivedShows() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: archivedProjects = [], isLoading } = useQuery<ArchivedProject[]>({
    queryKey: ["/api/projects/archived"],
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("POST", `/api/projects/${projectId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Show Unarchived",
        description: "The show has been moved back to your active projects.",
      });
    },
    onError: (error) => {
      console.error("Error unarchiving project:", error);
      toast({
        title: "Error",
        description: "Failed to unarchive the show. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return null;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Archive className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Archived Shows</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Archive className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Archived Shows</h1>
          {archivedProjects && archivedProjects.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {archivedProjects.length}
            </Badge>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href="/projects">Back to Active Shows</Link>
        </Button>
      </div>

      {!archivedProjects || archivedProjects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No Archived Shows</h3>
              <p className="text-muted-foreground">
                You haven't archived any shows yet. Shows that have closed can be archived to keep your dashboard organized while preserving all data.
              </p>
            </div>
            <Button asChild>
              <Link href="/projects">View Active Shows</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {archivedProjects.map((project) => (
            <Card key={project.id} className="relative group">
              <div className="absolute top-3 right-3 z-10">
                <Badge variant="secondary" className="text-xs">
                  <Archive className="h-3 w-3 mr-1" />
                  Archived
                </Badge>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg leading-tight pr-16">
                  <Link
                    href={`/projects/${project.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {project.name}
                  </Link>
                </CardTitle>
                {project.description && (
                  <CardDescription className="text-sm line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {project.venue && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{project.venue}</span>
                    </div>
                  )}

                  {(project.openingNight || project.closingDate) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {project.openingNight && project.closingDate
                          ? `${formatDate(project.openingNight)} - ${formatDate(project.closingDate)}`
                          : project.openingNight
                          ? `Opens ${formatDate(project.openingNight)}`
                          : `Closes ${formatDate(project.closingDate)}`
                        }
                      </span>
                    </div>
                  )}

                  {project.archivedAt && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Archive className="h-3 w-3 flex-shrink-0" />
                      <span>Archived {formatDateTime(project.archivedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/shows/${project.id}`}>
                      <Users className="h-4 w-4 mr-1" />
                      View Details
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unarchiveMutation.mutate(project.id)}
                    disabled={unarchiveMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}