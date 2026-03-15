import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import WaitlistEmailSettings from "./WaitlistEmailSettings";
import WaitlistBulkEmail from "./WaitlistBulkEmail";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail,
  Calendar,
  User,
  Trash2,
  Settings,
  Send,
  Download
} from "lucide-react";
import { format } from "date-fns";

interface WaitlistEntry {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organization: string | null;
  role: string | null;
  experience: string | null;
  howHeard: string | null;
  additionalInfo: string | null;
  status: string;
  position: number | null;
  invitedAt: Date | null;
  convertedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WaitlistStats {
  total: number;
  pending: number;
  contacted: number;
  converted: number;
  declined: number;
}

export default function WaitlistManagement() {
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<WaitlistEntry | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: waitlistEntries = [], isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ["/api/waitlist"],
  });

  const { data: stats } = useQuery<WaitlistStats>({
    queryKey: ["/api/waitlist/stats"],
  });

  const updateEntryMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const response = await fetch(`/api/waitlist/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data.updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update entry");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist/stats"] });
      toast({
        title: "Entry updated",
        description: "Waitlist entry has been updated successfully.",
      });
      closeDialog();
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update waitlist entry.",
        variant: "destructive",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete entry");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist/stats"] });
      toast({
        title: "Entry deleted",
        description: "Waitlist entry has been deleted successfully.",
      });
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete waitlist entry.",
        variant: "destructive",
      });
    },
  });

  const openDialog = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setNotes(entry.notes || "");
    setStatus(entry.status);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    // Clear state after a brief delay to prevent flash
    setTimeout(() => {
      setSelectedEntry(null);
      setNotes("");
      setStatus("");
    }, 200);
  };

  const handleUpdateEntry = (entry: WaitlistEntry) => {
    openDialog(entry);
  };

  const handleSaveUpdate = () => {
    if (!selectedEntry) return;

    const updates: any = {
      status,
      notes,
    };

    if (status === "contacted" && selectedEntry.status !== "contacted") {
      updates.invitedAt = new Date().toISOString();
    }

    if (status === "converted" && selectedEntry.status !== "converted") {
      updates.convertedAt = new Date().toISOString();
    }

    updateEntryMutation.mutate({
      id: selectedEntry.id,
      updates,
    });
  };

  const handleDeleteEntry = (entry: WaitlistEntry) => {
    setEntryToDelete(entry);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteEntryMutation.mutate(entryToDelete.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      contacted: "default",
      converted: "success",
      declined: "destructive",
    } as const;

    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      contacted: "bg-blue-100 text-blue-800",
      converted: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "contacted":
        return <Mail className="h-4 w-4 text-blue-600" />;
      case "converted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "declined":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleDownloadCSV = () => {
    const csvHeader = "First Name,Last Name,Email\n";
    const csvContent = waitlistEntries.map(entry => {
      const firstName = (entry.firstName || "").replace(/,/g, "");
      const lastName = (entry.lastName || "").replace(/,/g, "");
      const email = (entry.email || "").replace(/,/g, "");
      return `${firstName},${lastName},${email}`;
    }).join("\n");
    
    const blob = new Blob([csvHeader + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `waitlist_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: `Exported ${waitlistEntries.length} entries to CSV.`,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading waitlist...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="entries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Waitlist Entries
          </TabsTrigger>
          <TabsTrigger value="bulk-email" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Bulk Email
          </TabsTrigger>
          <TabsTrigger value="email-settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Email Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Contacted</p>
                  <p className="text-2xl font-bold">{stats.contacted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Converted</p>
                  <p className="text-2xl font-bold">{stats.converted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Declined</p>
                  <p className="text-2xl font-bold">{stats.declined}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Waitlist Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Waitlist Entries</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            disabled={waitlistEntries.length === 0}
            data-testid="button-download-waitlist-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitlistEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.position}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>
                        {entry.firstName} {entry.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.email}
                  </TableCell>
                  <TableCell>
                    {entry.experience ? (
                      <Badge variant="outline">
                        {entry.experience.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(entry.status)}
                      {getStatusBadge(entry.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {format(new Date(entry.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog open={isDialogOpen && selectedEntry?.id === entry.id} onOpenChange={(open) => {
                        if (!open) {
                          closeDialog();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUpdateEntry(entry)}
                          >
                            Manage
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Manage Waitlist Entry #{entry.position}
                          </DialogTitle>
                        </DialogHeader>
                        {selectedEntry && (
                          <div className="space-y-6">
                            {/* Contact Information */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Name</Label>
                                <p className="text-sm font-medium">
                                  {selectedEntry.firstName} {selectedEntry.lastName}
                                </p>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <p className="text-sm font-mono">
                                  {selectedEntry.email}
                                </p>
                              </div>
                              <div>
                                <Label>Organization</Label>
                                <p className="text-sm">
                                  {selectedEntry.organization || "Not provided"}
                                </p>
                              </div>
                              <div>
                                <Label>Role</Label>
                                <p className="text-sm">
                                  {selectedEntry.role?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || "Not provided"}
                                </p>
                              </div>
                              <div>
                                <Label>Experience</Label>
                                <p className="text-sm">
                                  {selectedEntry.experience?.replace(/\b\w/g, l => l.toUpperCase()) || "Not provided"}
                                </p>
                              </div>
                              <div>
                                <Label>How they heard about us</Label>
                                <p className="text-sm">
                                  {selectedEntry.howHeard?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || "Not provided"}
                                </p>
                              </div>
                            </div>

                            {/* Additional Info */}
                            {selectedEntry.additionalInfo && (
                              <div>
                                <Label>Additional Information</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm">{selectedEntry.additionalInfo}</p>
                                </div>
                              </div>
                            )}

                            {/* Status and Notes */}
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="status">Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="contacted">Contacted</SelectItem>
                                    <SelectItem value="converted">Converted</SelectItem>
                                    <SelectItem value="declined">Declined</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="notes">Admin Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="Add internal notes about this entry..."
                                  rows={3}
                                />
                              </div>
                            </div>

                            {/* Timestamps */}
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                              <div>
                                <Label className="text-xs">Joined</Label>
                                <p>{format(new Date(selectedEntry.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                              </div>
                              {selectedEntry.invitedAt && (
                                <div>
                                  <Label className="text-xs">Contacted</Label>
                                  <p>{format(new Date(selectedEntry.invitedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                                </div>
                              )}
                              {selectedEntry.convertedAt && (
                                <div>
                                  <Label className="text-xs">Converted</Label>
                                  <p>{format(new Date(selectedEntry.convertedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={closeDialog}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleSaveUpdate}
                                disabled={updateEntryMutation.isPending}
                              >
                                {updateEntryMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Waitlist Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this waitlist entry? This action cannot be undone.
            </p>
            {entryToDelete && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">
                  {entryToDelete.firstName} {entryToDelete.lastName}
                </p>
                <p className="text-sm text-gray-600">{entryToDelete.email}</p>
                <p className="text-sm text-gray-600">Position #{entryToDelete.position}</p>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteEntryMutation.isPending}
              >
                {deleteEntryMutation.isPending ? "Deleting..." : "Delete Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="bulk-email">
          <WaitlistBulkEmail />
        </TabsContent>

        <TabsContent value="email-settings">
          <WaitlistEmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}