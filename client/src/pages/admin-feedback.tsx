import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Bug, Lightbulb, Settings2, MessageSquare, Eye, Edit, Trash2, User, ChevronRight, Filter, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Feedback as FeedbackType } from "@/../../shared/schema";

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

export default function AdminFeedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: feedback = [], isLoading } = useQuery<FeedbackType[]>({
    queryKey: ["/api/feedback"],
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/feedback/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/feedback"] });
      const previousFeedback = queryClient.getQueryData(["/api/feedback"]);
      queryClient.setQueryData(["/api/feedback"], (old: any) =>
        old?.map((item: Feedback) =>
          item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
        )
      );
      return { previousFeedback };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      setIsEditModalOpen(false);
      setSelectedFeedback(null);
      toast({
        title: "Feedback updated",
        description: "The feedback has been successfully updated.",
      });
    },
    onError: (error: any, _, context) => {
      if (context?.previousFeedback) {
        queryClient.setQueryData(["/api/feedback"], context.previousFeedback);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback",
        variant: "destructive",
      });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/feedback/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/feedback"] });
      const previousFeedback = queryClient.getQueryData(["/api/feedback"]);
      queryClient.setQueryData(["/api/feedback"], (old: any) =>
        old?.filter((item: Feedback) => item.id !== id)
      );
      return { previousFeedback };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast({
        title: "Feedback deleted",
        description: "The feedback has been successfully deleted.",
      });
    },
    onError: (error: any, _, context) => {
      if (context?.previousFeedback) {
        queryClient.setQueryData(["/api/feedback"], context.previousFeedback);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete feedback",
        variant: "destructive",
      });
    },
  });

  const handleUpdateFeedback = () => {
    if (!selectedFeedback) return;

    const updateData: any = {};
    if (newStatus && newStatus !== selectedFeedback.status) {
      updateData.status = newStatus;
    }
    if (adminNotes !== (selectedFeedback.adminNotes || "")) {
      updateData.adminNotes = adminNotes;
    }

    if (Object.keys(updateData).length > 0) {
      updateFeedbackMutation.mutate({ id: selectedFeedback.id, data: updateData });
    } else {
      setIsEditModalOpen(false);
    }
  };

  const openEditModal = (item: Feedback) => {
    setSelectedFeedback(item);
    setAdminNotes(item.adminNotes || "");
    setNewStatus(item.status);
    setIsEditModalOpen(true);
  };

  const openViewModal = (item: Feedback) => {
    setSelectedFeedback(item);
    setIsViewModalOpen(true);
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

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getSubmitterName = (submitter?: Feedback["submitter"]) => {
    if (!submitter) return "Unknown User";
    if (submitter.firstName || submitter.lastName) {
      return `${submitter.firstName || ""} ${submitter.lastName || ""}`.trim();
    }
    return submitter.email;
  };

  const filteredFeedback = feedback.filter((item: Feedback) => {
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    const typeMatch = typeFilter === "all" || item.type === typeFilter;
    return statusMatch && typeMatch;
  });

  const getStatusStats = () => {
    const stats = feedback.reduce((acc: any, item: Feedback) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return stats;
  };

  const stats = getStatusStats();
  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all";

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max py-2">
            <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
              <div className="text-lg font-bold">{feedback.length}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
              <div className="text-lg font-bold text-blue-600">{stats.open || 0}</div>
              <div className="text-xs text-gray-500">Open</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
              <div className="text-lg font-bold text-yellow-600">{stats.in_review || 0}</div>
              <div className="text-xs text-gray-500">Review</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
              <div className="text-lg font-bold text-purple-600">{stats.in_progress || 0}</div>
              <div className="text-xs text-gray-500">Progress</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
              <div className="text-lg font-bold text-green-600">{stats.resolved || 0}</div>
              <div className="text-xs text-gray-500">Resolved</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-1"
            data-testid="button-mobile-filters"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-white text-primary rounded-full h-5 w-5 text-xs flex items-center justify-center">
                {(statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0)}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No feedback found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFeedback.map((item: Feedback) => {
              const TypeIcon = typeIcons[item.type as keyof typeof typeIcons];
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border active:scale-[0.99] transition-transform"
                  onClick={() => openViewModal(item)}
                  data-testid={`card-admin-feedback-${item.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeColors[item.type as keyof typeof typeColors]}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm truncate">{item.title}</h3>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${statusColors[item.status as keyof typeof statusColors]}`}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {getSubmitterName(item.submitter)} • {formatShortDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filter Feedback</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All" },
                    { value: "open", label: "Open" },
                    { value: "in_review", label: "In Review" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "resolved", label: "Resolved" },
                    { value: "closed", label: "Closed" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatusFilter(option.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        statusFilter === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All" },
                    { value: "bug", label: "Bug" },
                    { value: "feature", label: "Feature" },
                    { value: "improvement", label: "Improvement" },
                    { value: "other", label: "Other" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTypeFilter(option.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        typeFilter === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <SheetFooter>
              <Button onClick={() => setShowMobileFilters(false)} className="w-full">
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle>Feedback Details</SheetTitle>
            </SheetHeader>
            {selectedFeedback && (
              <div className="py-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={typeColors[selectedFeedback.type as keyof typeof typeColors]}>
                    {selectedFeedback.type}
                  </Badge>
                  <Badge className={priorityColors[selectedFeedback.priority as keyof typeof priorityColors]}>
                    {selectedFeedback.priority}
                  </Badge>
                  <Badge className={statusColors[selectedFeedback.status as keyof typeof statusColors]}>
                    {selectedFeedback.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-lg">{selectedFeedback.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{getSubmitterName(selectedFeedback.submitter)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Submitted: {formatDate(selectedFeedback.createdAt)}
                  </div>
                </div>

                {selectedFeedback.adminNotes && (
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <p className="text-xs font-medium text-blue-800 mb-1">Admin Notes:</p>
                    <p className="text-sm text-blue-700">{selectedFeedback.adminNotes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      openEditModal(selectedFeedback);
                    }}
                    className="flex-1"
                    data-testid="button-edit-feedback"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setFeedbackToDelete(selectedFeedback);
                      setIsDeleteDialogOpen(true);
                    }}
                    data-testid="button-delete-feedback"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle>Update Feedback</SheetTitle>
              <SheetDescription>Change status and add notes</SheetDescription>
            </SheetHeader>
            {selectedFeedback && (
              <div className="py-4 space-y-4 flex flex-col h-[calc(100%-80px)]">
                <div className="flex-1 space-y-4 overflow-y-auto">
                  <div>
                    <p className="text-sm font-medium text-gray-700 truncate">{selectedFeedback.title}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "open", label: "Open", color: "border-blue-400" },
                        { value: "in_review", label: "In Review", color: "border-yellow-400" },
                        { value: "in_progress", label: "In Progress", color: "border-purple-400" },
                        { value: "resolved", label: "Resolved", color: "border-green-400" },
                        { value: "closed", label: "Closed", color: "border-gray-400" },
                      ].map((status) => (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => setNewStatus(status.value)}
                          className={`p-3 rounded-lg border-2 text-center text-sm transition-all ${
                            newStatus === status.value
                              ? `${status.color} bg-gray-50 font-medium`
                              : "border-gray-200"
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes for the user..."
                      className="min-h-24"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleUpdateFeedback}
                    disabled={updateFeedbackMutation.isPending}
                    className="w-full h-12"
                    data-testid="button-save-feedback"
                  >
                    {updateFeedbackMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setFeedbackToDelete(null);
        }}>
          <AlertDialogContent className="max-w-[90vw] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this feedback? This action cannot be undone.
                {feedbackToDelete && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                    <strong>{feedbackToDelete.title}</strong>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (feedbackToDelete) {
                    deleteFeedbackMutation.mutate(feedbackToDelete.id);
                    setIsDeleteDialogOpen(false);
                    setFeedbackToDelete(null);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold">{feedback.length}</div>
            <div className="text-sm text-gray-600">Total Feedback</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.open || 0}</div>
            <div className="text-sm text-gray-600">Open</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.in_review || 0}</div>
            <div className="text-sm text-gray-600">In Review</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.in_progress || 0}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.resolved || 0}</div>
            <div className="text-sm text-gray-600">Resolved</div>
          </Card>
        </div>

        <div className="flex gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bug Reports</SelectItem>
              <SelectItem value="feature">Feature Requests</SelectItem>
              <SelectItem value="improvement">Improvements</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Items ({filteredFeedback.length})</CardTitle>
          <CardDescription>
            Manage user feedback and feature requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading feedback...</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No feedback matches the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map((item: Feedback) => {
                const TypeIcon = typeIcons[item.type as keyof typeof typeIcons];
                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <TypeIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{item.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {getSubmitterName(item.submitter)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
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
                        
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewModal(item)}
                            data-testid={`button-view-feedback-${item.id}`}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(item)}
                            data-testid={`button-edit-feedback-${item.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFeedbackToDelete(item);
                              setIsDeleteDialogOpen(true);
                            }}
                            disabled={deleteFeedbackMutation.isPending}
                            data-testid={`button-delete-feedback-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Badge className={typeColors[selectedFeedback.type as keyof typeof typeColors]}>
                    {selectedFeedback.type}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Badge className={priorityColors[selectedFeedback.priority as keyof typeof priorityColors]}>
                    {selectedFeedback.priority}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={statusColors[selectedFeedback.status as keyof typeof statusColors]}>
                    {selectedFeedback.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm">{selectedFeedback.category || "Not specified"}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Title</label>
                <p className="text-sm mt-1">{selectedFeedback.title}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Submitted By</label>
                <p className="text-sm mt-1">{getSubmitterName(selectedFeedback.submitter)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Submitted Date</label>
                <p className="text-sm mt-1">{formatDate(selectedFeedback.createdAt)}</p>
              </div>
              
              {selectedFeedback.adminNotes && (
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <p className="text-sm mt-1 bg-blue-50 p-3 rounded">{selectedFeedback.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Feedback</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Current Title</label>
                <p className="text-sm mt-1 font-medium">{selectedFeedback.title}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for the user..."
                  className="min-h-24 mt-1"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateFeedback}
                  disabled={updateFeedbackMutation.isPending}
                >
                  {updateFeedbackMutation.isPending ? "Updating..." : "Update Feedback"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) setFeedbackToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
              {feedbackToDelete && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                  <strong>{feedbackToDelete.title}</strong>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (feedbackToDelete) {
                  deleteFeedbackMutation.mutate(feedbackToDelete.id);
                  setIsDeleteDialogOpen(false);
                  setFeedbackToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
