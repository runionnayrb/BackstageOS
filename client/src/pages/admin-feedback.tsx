import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bug, Lightbulb, Settings2, MessageSquare, Eye, Edit, Trash2, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["/api/feedback"],
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      setIsEditModalOpen(false);
      setSelectedFeedback(null);
      toast({
        title: "Feedback updated",
        description: "The feedback has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback",
        variant: "destructive",
      });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/feedback/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast({
        title: "Feedback deleted",
        description: "The feedback has been successfully deleted.",
      });
    },
    onError: (error: any) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-6">Feedback Management</h2>
        
        {/* Stats Cards */}
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

        {/* Filters */}
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

      {/* Feedback List */}
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
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFeedbackMutation.mutate(item.id)}
                            disabled={deleteFeedbackMutation.isPending}
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

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              Complete feedback information and history
            </DialogDescription>
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

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Feedback</DialogTitle>
            <DialogDescription>
              Change status and add admin notes
            </DialogDescription>
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
    </div>
  );
}