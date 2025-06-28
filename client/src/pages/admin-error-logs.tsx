import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Bug, Wifi, Monitor, MousePointer, FileText, Eye, Calendar, Search } from "lucide-react";
import { ErrorLog } from "@/../../shared/schema";

const errorTypeIcons = {
  javascript_error: Bug,
  network_error: Wifi,
  page_load_failure: Monitor,
  click_failure: MousePointer,
  form_submission_error: FileText,
  navigation_error: AlertTriangle,
};

const errorTypeColors = {
  javascript_error: "bg-red-100 text-red-800",
  network_error: "bg-orange-100 text-orange-800",
  page_load_failure: "bg-purple-100 text-purple-800",
  click_failure: "bg-blue-100 text-blue-800",
  form_submission_error: "bg-yellow-100 text-yellow-800",
  navigation_error: "bg-pink-100 text-pink-800",
};

export default function AdminErrorLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  const { data: errorLogs = [], isLoading } = useQuery<ErrorLog[]>({
    queryKey: ["/api/errors"],
  });

  // Filter error logs based on search and type filter
  const filteredErrorLogs = errorLogs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.page.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || log.errorType === filterType;
    
    return matchesSearch && matchesType;
  });

  // Get stats for the cards
  const stats = errorLogs.reduce((acc, log) => {
    acc[log.errorType] = (acc[log.errorType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatUserAgent = (userAgent: string) => {
    // Extract browser and OS info
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    return match ? match[0] : userAgent.substring(0, 50) + "...";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-6">Error Logs</h2>
          <div className="text-center py-8">Loading error logs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-6">Error Logs</h2>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold">{errorLogs.length}</div>
            <div className="text-sm text-gray-600">Total Errors</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.javascript_error || 0}</div>
            <div className="text-sm text-gray-600">JavaScript Errors</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.network_error || 0}</div>
            <div className="text-sm text-gray-600">Network Errors</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.click_failure || 0}</div>
            <div className="text-sm text-gray-600">Click Failures</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search errors by message, page, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="javascript_error">JavaScript Errors</SelectItem>
              <SelectItem value="network_error">Network Errors</SelectItem>
              <SelectItem value="page_load_failure">Page Load Failures</SelectItem>
              <SelectItem value="click_failure">Click Failures</SelectItem>
              <SelectItem value="form_submission_error">Form Errors</SelectItem>
              <SelectItem value="navigation_error">Navigation Errors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors ({filteredErrorLogs.length})</CardTitle>
            <CardDescription>
              Automatic error logging captures JavaScript errors, network failures, and user interaction issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredErrorLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchTerm || filterType !== "all" ? "No errors match your filters" : "No errors recorded yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredErrorLogs.map((errorLog) => {
                      const IconComponent = errorTypeIcons[errorLog.errorType as keyof typeof errorTypeIcons] || AlertTriangle;
                      
                      return (
                        <TableRow key={errorLog.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <Badge 
                                className={errorTypeColors[errorLog.errorType as keyof typeof errorTypeColors] || "bg-gray-100 text-gray-800"}
                                variant="secondary"
                              >
                                {errorLog.errorType.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={errorLog.message}>
                              {errorLog.message}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-gray-100 px-1 rounded">
                              {errorLog.page}
                            </code>
                          </TableCell>
                          <TableCell>
                            {errorLog.userId ? (
                              <span className="text-sm">User {errorLog.userId}</span>
                            ) : (
                              <span className="text-gray-400">Anonymous</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="h-3 w-3" />
                              {formatDate(errorLog.createdAt.toString())}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedError(errorLog)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Error Details</DialogTitle>
                                  <DialogDescription>
                                    Detailed information about this error occurrence
                                  </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="max-h-96">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Error Information</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="font-medium">Type:</span> {errorLog.errorType}
                                        </div>
                                        <div>
                                          <span className="font-medium">Page:</span> {errorLog.page}
                                        </div>
                                        <div>
                                          <span className="font-medium">User Action:</span> {errorLog.userAction || "N/A"}
                                        </div>
                                        <div>
                                          <span className="font-medium">Element:</span> {errorLog.elementClicked || "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-medium mb-2">Message</h4>
                                      <div className="bg-gray-50 p-3 rounded text-sm">
                                        {errorLog.message}
                                      </div>
                                    </div>

                                    {errorLog.stackTrace && (
                                      <div>
                                        <h4 className="font-medium mb-2">Stack Trace</h4>
                                        <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                                          {errorLog.stackTrace}
                                        </div>
                                      </div>
                                    )}

                                    <div>
                                      <h4 className="font-medium mb-2">Browser Information</h4>
                                      <div className="bg-gray-50 p-3 rounded text-sm">
                                        {formatUserAgent(errorLog.userAgent)}
                                      </div>
                                    </div>

                                    {errorLog.additionalData && (
                                      <div>
                                        <h4 className="font-medium mb-2">Additional Data</h4>
                                        <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                                          <pre>{JSON.stringify(errorLog.additionalData, null, 2)}</pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}