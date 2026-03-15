import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, Loader2, Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = 'create' | 'dates' | 'billing' | 'complete';

export default function ShowOnboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('create');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState({
    name: '',
    venue: '',
    director: '',
  });
  const [dates, setDates] = useState({
    prepStartDate: '',
    firstRehearsalDate: '',
    designerRunDate: '',
    firstTechDate: '',
    firstPreviewDate: '',
    openingNight: '',
    closingDate: '',
  });

  const isBetaUser = (user as any)?.betaAccess === true;
  const userIsAdmin = (user as any)?.isAdmin === true;

  const createShowMutation = useMutation({
    mutationFn: async (data: typeof showInfo) => {
      const result = await apiRequest("POST", "/api/projects", {
        name: data.name,
        venue: data.venue || null,
        director: data.director || null,
      });
      return result;
    },
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setProjectId(project.id);
      setCurrentStep('dates');
    },
    onError: (error: any) => {
      const errorData = error?.response || error;
      const message = errorData?.betaLimitReached 
        ? "Beta users are limited to 1 active show. Please archive your current show to create a new one."
        : "Failed to create show. Please try again.";
      toast({
        title: errorData?.betaLimitReached ? "Show Limit Reached" : "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateDatesMutation = useMutation({
    mutationFn: async (dateData: typeof dates) => {
      if (!projectId) return;
      await apiRequest("PATCH", `/api/projects/${projectId}`, {
        prepStartDate: dateData.prepStartDate || null,
        firstRehearsalDate: dateData.firstRehearsalDate || null,
        designerRunDate: dateData.designerRunDate || null,
        firstTechDate: dateData.firstTechDate || null,
        firstPreviewDate: dateData.firstPreviewDate || null,
        openingNight: dateData.openingNight || null,
        closingDate: dateData.closingDate || null,
      });
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      }
      if (isBetaUser) {
        setCurrentStep('complete');
      } else {
        setCurrentStep('billing');
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save dates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateShow = () => {
    if (!showInfo.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your show.",
        variant: "destructive",
      });
      return;
    }
    createShowMutation.mutate(showInfo);
  };

  const handleSaveDates = () => {
    updateDatesMutation.mutate(dates);
  };

  const handleSkipDates = () => {
    if (isBetaUser) {
      setCurrentStep('complete');
    } else {
      setCurrentStep('billing');
    }
  };

  const handleFinish = () => {
    if (projectId) {
      navigate(`/shows/${projectId}`);
    } else {
      navigate('/');
    }
  };

  const getProgress = () => {
    if (currentStep === 'create') return 25;
    if (currentStep === 'dates') return 50;
    if (currentStep === 'billing') return 75;
    return 100;
  };

  const getStepNumber = () => {
    if (currentStep === 'create') return 1;
    if (currentStep === 'dates') return 2;
    if (currentStep === 'billing') return 3;
    return isBetaUser ? 3 : 4;
  };

  const getTotalSteps = () => {
    return isBetaUser ? 3 : 4;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {currentStep === 'create' ? 'Create Your Show' : 
             currentStep === 'complete' ? 'All Set!' : 
             showInfo.name || 'New Show'}
          </h1>
          <p className="text-muted-foreground">
            Step {getStepNumber()} of {getTotalSteps()}
          </p>
        </div>

        <Progress value={getProgress()} className="mb-8 h-2" />

        {currentStep === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Show Details</CardTitle>
              <CardDescription>What are you working on?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="showName">Show Name *</Label>
                <Input
                  id="showName"
                  placeholder="e.g., Hamlet, The Lion King, Romeo & Juliet"
                  value={showInfo.name}
                  onChange={(e) => setShowInfo(s => ({ ...s, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="director">Director</Label>
                <Input
                  id="director"
                  placeholder="e.g., Jane Smith"
                  value={showInfo.director}
                  onChange={(e) => setShowInfo(s => ({ ...s, director: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  placeholder="e.g., Broadway Theatre, The Globe"
                  value={showInfo.venue}
                  onChange={(e) => setShowInfo(s => ({ ...s, venue: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleCreateShow} 
                className="w-full mt-4"
                size="lg"
                disabled={createShowMutation.isPending || !showInfo.name.trim()}
              >
                {createShowMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'dates' && (
          <Card>
            <CardHeader>
              <CardTitle>Production Dates</CardTitle>
              <CardDescription>Add your important production dates (all optional - you can update these later)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prepStartDate">Prep Start</Label>
                  <Input
                    id="prepStartDate"
                    type="date"
                    value={dates.prepStartDate}
                    onChange={(e) => setDates(d => ({ ...d, prepStartDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="firstRehearsalDate">First Rehearsal</Label>
                  <Input
                    id="firstRehearsalDate"
                    type="date"
                    value={dates.firstRehearsalDate}
                    onChange={(e) => setDates(d => ({ ...d, firstRehearsalDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="designerRunDate">Designer Run</Label>
                  <Input
                    id="designerRunDate"
                    type="date"
                    value={dates.designerRunDate}
                    onChange={(e) => setDates(d => ({ ...d, designerRunDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="firstTechDate">First Tech</Label>
                  <Input
                    id="firstTechDate"
                    type="date"
                    value={dates.firstTechDate}
                    onChange={(e) => setDates(d => ({ ...d, firstTechDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="firstPreviewDate">First Preview</Label>
                  <Input
                    id="firstPreviewDate"
                    type="date"
                    value={dates.firstPreviewDate}
                    onChange={(e) => setDates(d => ({ ...d, firstPreviewDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Your billing model is calculated from whichever comes first (First Rehearsal or Opening Night) to Closing Date. Shows running longer than 6 months incur a $100/month fee after activation.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="openingNight">Opening Night</Label>
                    <Input
                      id="openingNight"
                      type="date"
                      value={dates.openingNight}
                      onChange={(e) => setDates(d => ({ ...d, openingNight: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="closingDate">Closing Date</Label>
                    <Input
                      id="closingDate"
                      type="date"
                      value={dates.closingDate}
                      onChange={(e) => setDates(d => ({ ...d, closingDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleSkipDates} className="flex-1">
                  Skip for Now
                </Button>
                <Button 
                  onClick={handleSaveDates} 
                  className="flex-1"
                  disabled={updateDatesMutation.isPending}
                >
                  {updateDatesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save & Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'billing' && !isBetaUser && (
          <Card>
            <CardHeader>
              <CardTitle>Your Free Trial</CardTitle>
              <CardDescription>No credit card required to start</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <Clock className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>14-day free trial activated!</strong> Your trial starts now. You have full access to all features.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold">What happens next?</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Explore all features</p>
                      <p className="text-sm text-muted-foreground">Use BackstageOS with your full team for 14 days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Activate when ready</p>
                      <p className="text-sm text-muted-foreground">Pay $400 activation fee to continue after trial</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Long runs add monthly</p>
                      <p className="text-sm text-muted-foreground">Shows over 6 months add $100/month billing</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={() => setCurrentStep('complete')} className="w-full" size="lg">
                Got It, Let's Go!
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'complete' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
              <p className="text-muted-foreground mb-6">
                {isBetaUser 
                  ? `"${showInfo.name}" is ready to go. Enjoy your beta access!`
                  : `Your 14-day trial for "${showInfo.name}" has started. Start building your production!`
                }
              </p>
              
              {isBetaUser && (
                <Alert className="mb-6 border-blue-200 bg-blue-50 text-left">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Beta Access</strong> - You have free access during the beta period. Thanks for being an early tester!
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleFinish} size="lg" className="w-full">
                Go to {showInfo.name}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
