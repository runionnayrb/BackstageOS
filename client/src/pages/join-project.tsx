import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, UserPlus, LogIn, Theater, AlertCircle } from "lucide-react";
import type { Project } from "@shared/schema";

export default function JoinProject() {
  const [location, setLocation] = useLocation();
  
  // Extract projectId from URL path since we're not using Route component
  const projectId = location.startsWith('/join/') ? location.split('/join/')[1]?.split('/')[0] : undefined;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAuthChoice, setShowAuthChoice] = useState(false);

  const { data: projectInfo, isLoading: projectLoading, error: projectError, refetch } = useQuery<{
    project: Project;
    invitation: { id: number; email: string; role: string; status: string } | null;
  }>({
    queryKey: ['/api/projects', projectId, 'join-info', user?.email],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/join-info${user ? `?email=${encodeURIComponent(user.email)}` : ''}`);
      if (!response.ok) {
        throw new Error('Project not found');
      }
      return response.json();
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (user && projectId) {
      refetch();
    }
  }, [user, projectId, refetch]);

  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/accept-invitation`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'join-info', user?.email] });
      toast({
        title: "Welcome to the team!",
        description: `You've joined ${projectInfo?.project?.name}. Redirecting to the project...`,
      });
      setTimeout(() => {
        setLocation(`/shows/${projectId}`);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvitation = () => {
    acceptInvitationMutation.mutate();
  };

  const handleLogin = () => {
    sessionStorage.setItem('returnToJoin', `/join/${projectId}`);
    setLocation('/auth?mode=login');
  };

  const handleSignUp = () => {
    sessionStorage.setItem('returnToJoin', `/join/${projectId}`);
    setLocation('/auth?mode=register');
  };

  useEffect(() => {
    const returnPath = sessionStorage.getItem('returnToJoin');
    if (user && returnPath && returnPath.includes(`/join/${projectId}`)) {
      sessionStorage.removeItem('returnToJoin');
    }
  }, [user, projectId]);

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (projectError || !projectInfo?.project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation link may be invalid or expired. Please contact the person who invited you for a new link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation('/auth')} data-testid="button-go-to-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, invitation } = projectInfo;

  if (user) {
    const isAlreadyMember = invitation?.status === 'active';

    if (isAlreadyMember) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Already a Team Member</CardTitle>
              <CardDescription>
                You're already a member of {project.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setLocation(`/shows/${projectId}`)} data-testid="button-go-to-project">
                Go to Project
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Theater className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Join {project.name}</CardTitle>
            <CardDescription>
              {invitation ? (
                <>You've been invited to join as <strong className="text-foreground">{invitation.role}</strong></>
              ) : (
                "You've been invited to join this production"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Signed in as <strong className="text-foreground">{user.email}</strong></p>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleAcceptInvitation}
              disabled={acceptInvitationMutation.isPending}
              data-testid="button-accept-invitation"
            >
              {acceptInvitationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Theater className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Join {project.name}</CardTitle>
          <CardDescription>
            You've been invited to join this production. Sign in or create an account to accept the invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleLogin}
            data-testid="button-login-to-join"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In to Accept
          </Button>
          <Button 
            className="w-full" 
            variant="outline"
            size="lg"
            onClick={handleSignUp}
            data-testid="button-signup-to-join"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create an Account
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            After signing in, you'll be automatically redirected back to accept your invitation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
