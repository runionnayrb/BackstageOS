import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Plus, MessageSquare, Bug, Lightbulb, Settings2, Send, X, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/admin";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useErrorLogging } from "@/hooks/useErrorLogging";
import { useIsMobile } from "@/hooks/use-mobile";
import { Feedback as FeedbackType } from "@shared/schema";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "improvement", "other"]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface Feedback {
  id: number;
  type: string;
  priority: string;
  title: string;
  description: string;
  category?: string;
  status: string;
  adminNotes?: string;
  submittedBy: number;
  assignedTo?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  submitter?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

const typeIcons = {
  bug: Bug,
  feature: Lightbulb,
  improvement: Settings2,
  other: MessageSquare,
};

const typeColors = {
  bug: "bg-red-100 text-red-800",
  feature: "bg-blue-100 text-blue-800",
  improvement: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  in_review: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const typeLabels = {
  bug: "Bug Report",
  feature: "Feature Request", 
  improvement: "Improvement",
  other: "Other",
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("submit");
  const [showForm, setShowForm] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { wrapFormSubmission, wrapAsyncAction } = useErrorLogging();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "feature",
      priority: "medium",
      title: "",
      description: "",
      category: "",
    },
  });

  const { data: feedback = [], isLoading } = useQuery<FeedbackType[]>({
    queryKey: ["/api/feedback"],
    enabled: !!user,
  });

  const createFeedbackMutation = useMutation({
    mutationFn: wrapFormSubmission(
      (data: FeedbackFormData) => apiRequest("POST", "/api/feedback", data),
      "Feedback Submission Form"
    ),
    onMutate: async (newFeedback) => {
      await queryClient.cancelQueries({ queryKey: ["/api/feedback"] });
      const previousFeedback = queryClient.getQueryData(["/api/feedback"]);
      const optimisticFeedback = {
        id: Date.now(),
        ...newFeedback,
        status: "open",
        submittedBy: user?.id || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(["/api/feedback"], (old: any) => 
        old ? [optimisticFeedback, ...old] : [optimisticFeedback]
      );
      return { previousFeedback };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      form.reset();
      setShowForm(false);
      setMobileSheetOpen(false);
      setSelectedType(null);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
    },
    onError: (error: any, _, context) => {
      if (context?.previousFeedback) {
        queryClient.setQueryData(["/api/feedback"], context.previousFeedback);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    createFeedbackMutation.mutate(data);
  };

  const handleTypeSelect = (type: string) => {
    form.setValue("type", type as any);
    setSelectedType(type);
    if (isMobile) {
      setMobileSheetOpen(true);
    } else {
      setShowForm(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSubmitterName = (submitter?: Feedback["submitter"]) => {
    if (!submitter) return "Unknown User";
    if (submitter.firstName || submitter.lastName) {
      return `${submitter.firstName || ""} ${submitter.lastName || ""}`.trim();
    }
    return submitter.email;
  };

  const MobileFeedbackForm = () => (
    <div className="flex flex-col h-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="flex-1 space-y-4 overflow-y-auto pb-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">What's the issue?</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Brief summary..." 
                      className="h-12 text-base"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Tell us more</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your feedback in detail..."
                      className="min-h-32 text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">How urgent is this?</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "low", label: "Low", color: "border-gray-300" },
                      { value: "medium", label: "Medium", color: "border-yellow-400" },
                      { value: "high", label: "High", color: "border-orange-400" },
                      { value: "critical", label: "Critical", color: "border-red-500" },
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => field.onChange(priority.value)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          field.value === priority.value
                            ? `${priority.color} bg-gray-50 font-medium`
                            : "border-gray-200"
                        }`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-4 border-t">
            <Button 
              type="submit" 
              disabled={createFeedbackMutation.isPending}
              className="w-full h-14 text-lg font-medium"
              data-testid="button-submit-feedback"
            >
              {createFeedbackMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
          <div className="sticky top-0 bg-white border-b z-10">
            <TabsList className="w-full h-12 rounded-none bg-white p-0">
              <TabsTrigger 
                value="submit" 
                className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none"
                data-testid="tab-submit-feedback"
              >
                Submit
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none"
                data-testid="tab-feedback-history"
              >
                My Feedback
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="submit" className="flex-1 p-4 mt-0">
            <p className="text-gray-600 mb-4">What would you like to share?</p>
            <div className="space-y-3">
              {[
                { type: "bug", icon: Bug, label: "Report a Bug", desc: "Something isn't working right", color: "text-red-600 bg-red-50" },
                { type: "feature", icon: Lightbulb, label: "Request Feature", desc: "Suggest something new", color: "text-blue-600 bg-blue-50" },
                { type: "improvement", icon: Settings2, label: "Suggest Improvement", desc: "Make something better", color: "text-green-600 bg-green-50" },
                { type: "other", icon: MessageSquare, label: "Other Feedback", desc: "General thoughts", color: "text-gray-600 bg-gray-100" },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleTypeSelect(item.type)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border active:scale-[0.98] transition-transform"
                  data-testid={`button-feedback-type-${item.type}`}
                >
                  <div className={`p-3 rounded-full ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 p-4 mt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : feedback.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No feedback yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("submit")}
                >
                  Submit your first feedback
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {feedback.map((item: Feedback) => {
                  const TypeIcon = typeIcons[item.type as keyof typeof typeIcons];
                  return (
                    <div 
                      key={item.id} 
                      className="bg-white rounded-xl p-4 border"
                      data-testid={`card-feedback-${item.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <TypeIcon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{item.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={`text-xs ${statusColors[item.status as keyof typeof statusColors]}`}>
                              {item.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          {item.adminNotes && (
                            <div className="mt-3 p-2 bg-blue-50 rounded-lg border-l-2 border-blue-400">
                              <p className="text-xs font-medium text-blue-800">Response:</p>
                              <p className="text-sm text-blue-700">{item.adminNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Sheet open={mobileSheetOpen} onOpenChange={(open) => {
          setMobileSheetOpen(open);
          if (!open) {
            setSelectedType(null);
            form.reset();
          }
        }}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                {selectedType && (
                  <>
                    {selectedType === "bug" && <Bug className="h-5 w-5 text-red-600" />}
                    {selectedType === "feature" && <Lightbulb className="h-5 w-5 text-blue-600" />}
                    {selectedType === "improvement" && <Settings2 className="h-5 w-5 text-green-600" />}
                    {selectedType === "other" && <MessageSquare className="h-5 w-5 text-gray-600" />}
                    {typeLabels[selectedType as keyof typeof typeLabels]}
                  </>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="pt-4 h-[calc(100%-60px)]">
              <MobileFeedbackForm />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback Center</h1>
          <p className="text-gray-600">Help us improve BackstageOS</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Submit Feedback
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            My Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit New Feedback</CardTitle>
              <CardDescription>
                Help us improve BackstageOS by reporting bugs, suggesting features, or sharing your thoughts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showForm ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-red-600 hover:text-red-700"
                    onClick={() => handleTypeSelect("bug")}
                    data-testid="button-report-bug"
                  >
                    <Bug className="h-6 w-6" />
                    <span>Report Bug</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-blue-600 hover:text-blue-700"
                    onClick={() => handleTypeSelect("feature")}
                    data-testid="button-request-feature"
                  >
                    <Lightbulb className="h-6 w-6" />
                    <span>Request Feature</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-green-600 hover:text-green-700"
                    onClick={() => handleTypeSelect("improvement")}
                    data-testid="button-suggest-improvement"
                  >
                    <Settings2 className="h-6 w-6" />
                    <span>Suggest Improvement</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-gray-600 hover:text-gray-700"
                    onClick={() => handleTypeSelect("other")}
                    data-testid="button-other-feedback"
                  >
                    <MessageSquare className="h-6 w-6" />
                    <span>Other Feedback</span>
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="improvement">Improvement</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="reports">Reports</SelectItem>
                                <SelectItem value="script">Script Editor</SelectItem>
                                <SelectItem value="props">Props Tracker</SelectItem>
                                <SelectItem value="costumes">Costume Tracker</SelectItem>
                                <SelectItem value="admin">Admin Dashboard</SelectItem>
                                <SelectItem value="ui">User Interface</SelectItem>
                                <SelectItem value="performance">Performance</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief summary of your feedback" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed description of your feedback..."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button type="submit" disabled={createFeedbackMutation.isPending}>
                        {createFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Feedback History</CardTitle>
              <CardDescription>
                Track the status of your submitted feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading feedback...</div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No feedback submitted yet. Click "Submit Feedback" to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item: Feedback) => {
                    const TypeIcon = typeIcons[item.type as keyof typeof typeIcons];
                    return (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <TypeIcon className="h-5 w-5 text-gray-600" />
                            <div>
                              <h3 className="font-medium">{item.title}</h3>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-2">
                              <Badge className={typeColors[item.type as keyof typeof typeColors]}>
                                {item.type}
                              </Badge>
                              <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
                                {item.priority}
                              </Badge>
                              <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                                {item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        {item.adminNotes && (
                          <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                            <p className="text-sm font-medium text-blue-900">Admin Response:</p>
                            <p className="text-sm text-blue-800">{item.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
