import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Bug,
  Clock,
  Cpu,
  Eye,
  Filter,
  Network,
  Search,
  Server,
  Users,
  Wrench,
  Zap
} from "lucide-react";

// Error type icons
const errorTypeIcons = {
  javascript_error: Bug,
  network_error: Network,
  server_error: Server,
  validation_error: AlertTriangle,
  authentication_error: Users,
  performance_error: Cpu,
  timeout_error: Clock
};

// Error type colors
const errorTypeColors = {
  javascript_error: "bg-red-100 text-red-800",
  network_error: "bg-blue-100 text-blue-800",
  server_error: "bg-purple-100 text-purple-800",
  validation_error: "bg-yellow-100 text-yellow-800",
  authentication_error: "bg-orange-100 text-orange-800",
  performance_error: "bg-green-100 text-green-800",
  timeout_error: "bg-gray-100 text-gray-800"
};

interface ErrorLog {
  id: number;
  errorType: string;
  message: string;
  page: string;
  userId?: number;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  stackTrace?: string;
  userAgent: string;
  createdAt: Date;
}

export default function AdminErrorLogsClean() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch error logs
  const { data: errorLogs = [], isLoading } = useQuery({
    queryKey: ["/api/errors"],
    queryFn: () => apiRequest("/api/errors")
  });

  // Fetch users for filter dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("/api/admin/users")
  });

  // Calculate error priority
  const calculateErrorPriority = (errorLog: ErrorLog) => {
    let priority = 50; // Base priority
    
    // Error type impact
    const typeWeights = {
      server_error: 40,
      authentication_error: 35,
      javascript_error: 25,
      network_error: 20,
      validation_error: 15,
      performance_error: 10,
      timeout_error: 10
    };
    
    priority += typeWeights[errorLog.errorType as keyof typeof typeWeights] || 5;
    
    // Page criticality
    const criticalPages = ["/admin", "/login", "/profile"];
    if (criticalPages.some(page => errorLog.page.includes(page))) {
      priority += 30;
    }
    
    // Recent errors get higher priority
    const hoursSinceError = (Date.now() - new Date(errorLog.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceError < 1) priority += 20;
    else if (hoursSinceError < 24) priority += 10;
    
    return Math.min(priority, 150); // Cap at 150
  };

  // Get priority info
  const getPriorityInfo = (priority: number) => {
    if (priority >= 120) return { level: "Critical", color: "bg-red-100 text-red-800", icon: "🔥" };
    if (priority >= 100) return { level: "High", color: "bg-orange-100 text-orange-800", icon: "⚠️" };
    if (priority >= 80) return { level: "Medium", color: "bg-yellow-100 text-yellow-800", icon: "⚡" };
    return { level: "Low", color: "bg-blue-100 text-blue-800", icon: "ℹ️" };
  };

  // Filter error logs
  const filteredErrorLogs = errorLogs.filter((errorLog: ErrorLog) => {
    const matchesSearch = errorLog.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         errorLog.page.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (errorLog.userFirstName && errorLog.userFirstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (errorLog.userLastName && errorLog.userLastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (errorLog.userEmail && errorLog.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || errorLog.errorType === filterType;
    const matchesUser = filterUser === "all" || errorLog.userId?.toString() === filterUser;
    
    return matchesSearch && matchesType && matchesUser;
  });

  // Sort by priority (highest first)
  const sortedErrorLogs = filteredErrorLogs.sort((a: ErrorLog, b: ErrorLog) => {
    return calculateErrorPriority(b) - calculateErrorPriority(a);
  });

  // Analyze error mutation
  const analyzeErrorMutation = useMutation({
    mutationFn: (errorLog: ErrorLog) => apiRequest(`/api/errors/${errorLog.id}/analyze`, {
      method: "POST"
    }),
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Error analysis has been completed successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/errors"] });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the error. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Calculate stats
  const totalErrors = errorLogs.length;
  const criticalErrors = errorLogs.filter((log: ErrorLog) => calculateErrorPriority(log) >= 120).length;
  const recentErrors = errorLogs.filter((log: ErrorLog) => {
    const hoursSince = (Date.now() - new Date(log.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursSince <= 24;
  }).length;

  const uniqueUsers = new Set(errorLogs.filter((log: ErrorLog) => log.userId).map((log: ErrorLog) => log.userId)).size;
  const errorsByType = errorLogs.reduce((acc: Record<string, number>, log: ErrorLog) => {
    acc[log.errorType] = (acc[log.errorType] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading error logs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Error Logs</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Monitor and analyze application errors from registered users in production
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{totalErrors}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Errors</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-red-600">{criticalErrors}</div>
            <div className="text-xs sm:text-sm text-gray-600">Critical</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">{recentErrors}</div>
            <div className="text-xs sm:text-sm text-gray-600">Last 24h</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{uniqueUsers}</div>
            <div className="text-xs sm:text-sm text-gray-600">Affected Users</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">{Object.keys(errorsByType).length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Error Types</div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="javascript_error">JavaScript Error</SelectItem>
                  <SelectItem value="network_error">Network Error</SelectItem>
                  <SelectItem value="server_error">Server Error</SelectItem>
                  <SelectItem value="validation_error">Validation Error</SelectItem>
                  <SelectItem value="authentication_error">Authentication Error</SelectItem>
                  <SelectItem value="performance_error">Performance Error</SelectItem>
                  <SelectItem value="timeout_error">Timeout Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Error Logs ({sortedErrorLogs.length})</CardTitle>
            <CardDescription>Registered users in production only</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop View */}
            <div className="hidden md:block space-y-4">
              {sortedErrorLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || filterType !== "all" || filterUser !== "all" ? "No errors match your filters" : "No errors recorded yet"}
                </div>
              ) : (
                sortedErrorLogs.map((errorLog: ErrorLog) => {
                  const IconComponent = errorTypeIcons[errorLog.errorType as keyof typeof errorTypeIcons] || AlertTriangle;
                  const priority = calculateErrorPriority(errorLog);
                  const priorityInfo = getPriorityInfo(priority);
                  
                  return (
                    <Card key={errorLog.id} className="p-6 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{priorityInfo.icon}</span>
                          <Badge className={`${priorityInfo.color} font-medium`} variant="secondary">
                            {priorityInfo.level} Priority
                          </Badge>
                          <Badge 
                            className={`${errorTypeColors[errorLog.errorType as keyof typeof errorTypeColors] || "bg-gray-100 text-gray-800"}`}
                            variant="secondary"
                          >
                            <IconComponent className="h-4 w-4 mr-1" />
                            {errorLog.errorType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(errorLog.createdAt.toString())}
                        </div>
                      </div>
                      
                      <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                        <p className="text-sm text-red-800 font-mono leading-relaxed">
                          {errorLog.message}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Page:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                            {errorLog.page}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">User:</span>
                          <span className="ml-2">
                            {errorLog.userFirstName && errorLog.userLastName ? (
                              <span>
                                {errorLog.userFirstName} {errorLog.userLastName}
                                {errorLog.userEmail && (
                                  <span className="text-gray-500 text-xs block">{errorLog.userEmail}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">Anonymous</span>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedError(errorLog)}
                              className="flex-1"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => analyzeErrorMutation.mutate(errorLog)}
                          disabled={analyzeErrorMutation.isPending}
                          className="flex-1 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          {analyzeErrorMutation.isPending ? "Analyzing..." : "Analyze & Fix"}
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
              {sortedErrorLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || filterType !== "all" || filterUser !== "all" ? "No errors match your filters" : "No errors recorded yet"}
                </div>
              ) : (
                sortedErrorLogs.map((errorLog: ErrorLog) => {
                  const IconComponent = errorTypeIcons[errorLog.errorType as keyof typeof errorTypeIcons] || AlertTriangle;
                  const priority = calculateErrorPriority(errorLog);
                  const priorityInfo = getPriorityInfo(priority);
                  
                  return (
                    <Card key={errorLog.id} className="p-4 border-l-4 border-l-red-500">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{priorityInfo.icon}</span>
                            <Badge className={`${priorityInfo.color} text-xs`} variant="secondary">
                              {priorityInfo.level}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(errorLog.createdAt.toString())}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-gray-600" />
                          <Badge 
                            className={`${errorTypeColors[errorLog.errorType as keyof typeof errorTypeColors] || "bg-gray-100 text-gray-800"} text-xs`}
                            variant="secondary"
                          >
                            {errorLog.errorType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        
                        <div className="bg-red-50 p-3 rounded-md">
                          <p className="text-sm text-red-800 font-mono leading-tight">
                            {errorLog.message}
                          </p>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Page:</span>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-48 truncate">
                              {errorLog.page}
                            </code>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-600">User:</span>
                            <div className="text-right max-w-48">
                              {errorLog.userFirstName && errorLog.userLastName ? (
                                <div>
                                  <div className="font-medium truncate">
                                    {errorLog.userFirstName} {errorLog.userLastName}
                                  </div>
                                  {errorLog.userEmail && (
                                    <div className="text-xs text-gray-500 truncate">
                                      {errorLog.userEmail}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Anonymous</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-3 border-t border-gray-200">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedError(errorLog)}
                                className="flex-1 h-9"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Details
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => analyzeErrorMutation.mutate(errorLog)}
                            disabled={analyzeErrorMutation.isPending}
                            className="flex-1 h-9 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            {analyzeErrorMutation.isPending ? "Analyzing..." : "Analyze"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Error Details Modal */}
            {selectedError && (
              <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Error Details</DialogTitle>
                  <DialogDescription>
                    Complete information about this error
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Error Type</Label>
                    <div className="mt-1">
                      <Badge 
                        className={errorTypeColors[selectedError.errorType as keyof typeof errorTypeColors] || "bg-gray-100 text-gray-800"}
                        variant="secondary"
                      >
                        {selectedError.errorType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Message</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded font-mono text-sm break-words">
                      {selectedError.message}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Page</Label>
                    <div className="mt-1 text-sm">
                      <code className="bg-gray-100 px-2 py-1 rounded break-all">
                        {selectedError.page}
                      </code>
                    </div>
                  </div>
                  
                  {selectedError.stackTrace && (
                    <div>
                      <Label className="text-sm font-medium">Stack Trace</Label>
                      <ScrollArea className="mt-1 h-32 p-3 bg-gray-50 rounded">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                          {selectedError.stackTrace}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium">User Agent</Label>
                    <div className="mt-1 text-xs text-gray-600 font-mono break-words">
                      {selectedError.userAgent}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Timestamp</Label>
                    <div className="mt-1 text-sm">
                      {formatDate(selectedError.createdAt.toString())}
                    </div>
                  </div>
                </div>
              </DialogContent>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}