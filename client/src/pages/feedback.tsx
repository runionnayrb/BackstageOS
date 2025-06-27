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
import { ArrowLeft, Plus, MessageSquare, Bug, Lightbulb, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/admin";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function FeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("submit");
  const [showForm, setShowForm] = useState(false);

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

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["/api/feedback"],
    enabled: !!user,
  });

  const createFeedbackMutation = useMutation({
    mutationFn: (data: FeedbackFormData) => apiRequest("/api/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      form.reset();
      setShowForm(false);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
    },
    onError: (error: any) => {
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shows
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Feedback Center</h1>
          <p className="text-gray-600">Help us improve Backstage OS</p>
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
                Help us improve Backstage OS by reporting bugs, suggesting features, or sharing your thoughts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showForm ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-red-600 hover:text-red-700"
                    onClick={() => {
                      form.setValue("type", "bug");
                      setShowForm(true);
                    }}
                  >
                    <Bug className="h-6 w-6" />
                    <span>Report Bug</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-blue-600 hover:text-blue-700"
                    onClick={() => {
                      form.setValue("type", "feature");
                      setShowForm(true);
                    }}
                  >
                    <Lightbulb className="h-6 w-6" />
                    <span>Request Feature</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-green-600 hover:text-green-700"
                    onClick={() => {
                      form.setValue("type", "improvement");
                      setShowForm(true);
                    }}
                  >
                    <Settings2 className="h-6 w-6" />
                    <span>Suggest Improvement</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center gap-2 text-gray-600 hover:text-gray-700"
                    onClick={() => {
                      form.setValue("type", "other");
                      setShowForm(true);
                    }}
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