import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Bug, Wifi, Monitor, MousePointer, FileText, Eye, Calendar, Search, Play, Pause, Wrench, Activity, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { ErrorLog } from "@/../../shared/schema";
import { errorLogger } from "@/lib/errorLogger";

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
  const [filterUser, setFilterUser] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: errorLogs = [], isLoading } = useQuery<ErrorLog[]>({
    queryKey: ["/api/errors"],
  });

  // State for fix analysis and verification
  const [analyzedFix, setAnalyzedFix] = useState<any>(null);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [currentError, setCurrentError] = useState<ErrorLog | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  // Mutation to analyze errors and suggest fixes
  const analyzeErrorMutation = useMutation({
    mutationFn: async (errorLog: ErrorLog) => {
      const response = await fetch("/api/errors/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorLog }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to analyze error");
      }
      
      return response.json();
    },
    onSuccess: (data, errorLog) => {
      setAnalyzedFix(data);
      setCurrentError(errorLog);
      setShowFixDialog(true);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze this error for potential fixes",
        variant: "destructive",
      });
    },
  });

  // Mutation to mark error as fixed after verification
  const markFixedMutation = useMutation({
    mutationFn: async ({ errorId, fixDescription, verificationNotes }: {
      errorId: number;
      fixDescription: string;
      verificationNotes: string;
    }) => {
      const response = await fetch("/api/errors/mark-fixed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId, fixDescription, verificationNotes }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to mark error as fixed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Error Marked as Fixed",
        description: "Error has been verified and marked as resolved",
      });
      
      // Reset state and refetch
      setShowFixDialog(false);
      setAnalyzedFix(null);
      setCurrentError(null);
      setVerificationNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/errors"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Mark as Fixed",
        description: "Unable to mark error as fixed",
        variant: "destructive",
      });
    },
  });

  // Initialize logging state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('errorLoggingEnabled');
    if (savedState !== null) {
      const enabled = JSON.parse(savedState);
      setIsLoggingEnabled(enabled);
      if (enabled) {
        errorLogger.enable();
      } else {
        errorLogger.disable();
      }
    } else {
      // Check current state from errorLogger
      setIsLoggingEnabled(errorLogger.isEnabled());
    }
  }, []);

  const toggleLogging = () => {
    const newState = !isLoggingEnabled;
    setIsLoggingEnabled(newState);
    localStorage.setItem('errorLoggingEnabled', JSON.stringify(newState));
    
    if (newState) {
      errorLogger.enable();
    } else {
      errorLogger.disable();
    }
  };

  // Get unique users from error logs for dropdown
  const uniqueUsers = errorLogs.reduce((users, log) => {
    if (log.userId && !users.some(u => u.id === log.userId)) {
      const displayName = log.userFirstName && log.userLastName 
        ? `${log.userFirstName} ${log.userLastName}` 
        : log.userEmail || `User ${log.userId}`;
      users.push({
        id: log.userId,
        displayName,
        email: log.userEmail
      });
    }
    return users;
  }, [] as Array<{ id: string; displayName: string; email?: string; }>);

  // Calculate priority for error logs (higher number = higher priority)
  const calculateErrorPriority = (log: ErrorLog) => {
    let priority = 0;
    
    // Priority by error type (most critical first)
    const typePriority = {
      javascript_error: 100,      // Highest priority - breaks functionality
      form_submission_error: 90,  // High - prevents user actions
      page_load_failure: 80,      // High - prevents access
      click_failure: 70,          // Medium-high - UI issues
      navigation_error: 60,       // Medium - routing issues
      network_error: 50           // Lower - often temporary
    };
    priority += typePriority[log.errorType as keyof typeof typePriority] || 0;
    
    // Boost priority for recent errors (within last 24 hours)
    const errorAge = Date.now() - new Date(log.createdAt).getTime();
    const hoursOld = errorAge / (1000 * 60 * 60);
    if (hoursOld < 24) {
      priority += 20; // Recent errors are more relevant
    }
    
    // Boost priority for errors with stack traces (more actionable)
    if (log.stackTrace) {
      priority += 10;
    }
    
    // Boost priority for errors from specific critical pages
    const criticalPages = ['/login', '/register', '/shows', '/admin'];
    if (criticalPages.some(page => log.page.includes(page))) {
      priority += 15;
    }
    
    return priority;
  };

  // Filter and sort error logs by priority
  const filteredErrorLogs = errorLogs
    .filter(log => {
      const matchesSearch = searchTerm === "" || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.page.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userFirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userLastName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || log.errorType === filterType;
      const matchesUser = filterUser === "all" || log.userId === filterUser;
      
      return matchesSearch && matchesType && matchesUser;
    })
    .sort((a, b) => {
      const priorityA = calculateErrorPriority(a);
      const priorityB = calculateErrorPriority(b);
      
      // Sort by priority (highest first), then by creation date (newest first)
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

  const generateNaturalLanguageDescription = (errorLog: any): { description: string; impact: string; severity: string } => {
    const errorType = errorLog.errorType;
    const message = errorLog.message;
    const page = errorLog.page;

    let description = '';
    let impact = '';
    let severity = 'Low';

    switch (errorType) {
      case 'javascript_error':
        description = `A JavaScript programming error occurred on the ${page} page. This means some code failed to run properly, which could cause features to stop working or display incorrectly for users.`;
        impact = 'Users may experience broken functionality, missing content, or interface elements that don\'t respond to clicks.';
        severity = message.includes('Cannot read') || message.includes('undefined') ? 'High' : 'Medium';
        break;

      case 'network_error':
        description = `A network connection problem prevented data from loading on the ${page} page. This usually means the app couldn\'t communicate with the server to fetch or save information.`;
        impact = 'Users may see loading screens that never complete, empty sections, or get error messages when trying to save their work.';
        severity = 'High';
        break;

      case 'page_load_failure':
        description = `The ${page} page failed to load completely. This means users trying to visit this page encountered a problem that prevented it from displaying properly.`;
        impact = 'Users cannot access this page at all, creating a dead end in their workflow and potentially blocking critical tasks.';
        severity = 'Critical';
        break;

      case 'click_failure':
        description = `A button or interactive element on the ${page} page isn\'t working when users click it. This suggests a problem with the user interface that prevents normal interaction.`;
        impact = 'Users click buttons or links expecting something to happen, but nothing occurs, leading to confusion and inability to complete tasks.';
        severity = 'Medium';
        break;

      case 'form_submission_error':
        description = `A form on the ${page} page failed to submit properly when a user tried to save their information. This prevents users from saving their work or completing important actions.`;
        impact = 'Users lose their work and cannot complete essential tasks like creating shows, saving reports, or updating contact information.';
        severity = 'High';
        break;

      case 'navigation_error':
        description = `Users encountered a problem when trying to navigate to a different page from ${page}. This suggests an issue with the app\'s routing or page transitions.`;
        impact = 'Users get stuck on pages and cannot move through the application normally, disrupting their workflow.';
        severity = 'Medium';
        break;

      default:
        description = `An unexpected error occurred on the ${page} page. The system encountered a problem that wasn\'t anticipated.`;
        impact = 'This may cause unpredictable behavior and could affect user experience in various ways.';
        severity = 'Medium';
    }

    return { description, impact, severity };
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
    <div className="min-h-screen w-full p-0 space-y-6">
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-8 gap-6">
          <div className="flex items-center space-x-6">
            <div>
              <h2 className="text-3xl font-bold">Error Logs</h2>
              <p className="text-base text-gray-600">Monitor and resolve application errors</p>
            </div>
            <div className="flex gap-3">
              <Link href="/auto-resolution-dashboard">
                <Button variant="outline" size="default" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Auto-Resolution Dashboard
                </Button>
              </Link>
              <Link href="/advanced-analytics-dashboard">
                <Button variant="outline" size="default" className="flex items-center gap-2 border-purple-500 text-purple-600 hover:bg-purple-50">
                  <BarChart3 className="h-4 w-4" />
                  Advanced Analytics
                </Button>
              </Link>
            </div>
          </div>
          <Button
            onClick={toggleLogging}
            variant={isLoggingEnabled ? "default" : "outline"}
            className={`flex items-center gap-2 ${
              isLoggingEnabled 
                ? "bg-green-600 hover:bg-green-700" 
                : "border-red-500 text-red-600 hover:bg-red-50"
            }`}
          >
            {isLoggingEnabled ? (
              <>
                <Pause className="h-4 w-4" />
                Pause Logging
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Resume Logging
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-6 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search errors by message, page, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-52 h-10">
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
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-52 h-10">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Logs Table */}
        <div className="px-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors ({filteredErrorLogs.length})</CardTitle>
            <CardDescription>
              Error logging captures JavaScript errors, network failures, and user interaction issues from registered users in production only. 
              Errors are automatically prioritized by criticality - JavaScript errors and recent issues appear first.
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                isLoggingEnabled 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {isLoggingEnabled ? "● Live" : "● Paused"}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table className="w-full table-fixed border-collapse border border-gray-200">
                <TableHeader>
                  <TableRow className="border-b border-gray-200">
                    <TableHead className="w-[120px] px-4 py-3 font-semibold border-r border-gray-200 bg-gray-50">Priority</TableHead>
                    <TableHead className="w-[140px] px-4 py-3 font-semibold border-r border-gray-200 bg-gray-50">Type</TableHead>
                    <TableHead className="w-[280px] px-4 py-3 font-semibold border-r border-gray-200 bg-gray-50">Message</TableHead>
                    <TableHead className="w-[150px] px-4 py-3 font-semibold border-r border-gray-200 bg-gray-50">Page</TableHead>
                    <TableHead className="w-[120px] px-4 py-3 font-semibold border-r border-gray-200 bg-gray-50">User</TableHead>
                    <TableHead className="w-[140px] px-4 py-3 font-semibold border-r border-gray-200 bg-gray-50">Time</TableHead>
                    <TableHead className="w-[240px] px-4 py-3 font-semibold bg-gray-50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredErrorLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchTerm || filterType !== "all" || filterUser !== "all" ? "No errors match your filters" : "No errors recorded yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredErrorLogs.map((errorLog) => {
                      const IconComponent = errorTypeIcons[errorLog.errorType as keyof typeof errorTypeIcons] || AlertTriangle;
                      const priority = calculateErrorPriority(errorLog);
                      
                      // Determine priority level and styling
                      const getPriorityInfo = (priority: number) => {
                        if (priority >= 120) return { level: "Critical", color: "bg-red-100 text-red-800", icon: "🔥" };
                        if (priority >= 100) return { level: "High", color: "bg-orange-100 text-orange-800", icon: "⚠️" };
                        if (priority >= 80) return { level: "Medium", color: "bg-yellow-100 text-yellow-800", icon: "⚡" };
                        return { level: "Low", color: "bg-blue-100 text-blue-800", icon: "ℹ️" };
                      };
                      
                      const priorityInfo = getPriorityInfo(priority);
                      
                      return (
                        <TableRow key={errorLog.id}>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{priorityInfo.icon}</span>
                              <Badge className={`${priorityInfo.color} text-xs px-1 py-0`} variant="secondary">
                                {priorityInfo.level}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge 
                              className={`${errorTypeColors[errorLog.errorType as keyof typeof errorTypeColors] || "bg-gray-100 text-gray-800"} text-xs px-2 py-1`}
                              variant="secondary"
                            >
                              {errorLog.errorType.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="truncate text-sm" title={errorLog.message}>
                              {errorLog.message.split(':')[0]}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded truncate" title={errorLog.page}>
                              {errorLog.page}
                            </code>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {errorLog.userId ? (
                              <div className="text-xs font-medium truncate max-w-[100px]" title={errorLog.userFirstName && errorLog.userLastName 
                                  ? `${errorLog.userFirstName} ${errorLog.userLastName}`
                                  : errorLog.userEmail || `User ${errorLog.userId}`}>
                                {errorLog.userFirstName && errorLog.userLastName 
                                  ? `${errorLog.userFirstName} ${errorLog.userLastName}`
                                  : errorLog.userEmail || `User ${errorLog.userId}`
                                }
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Anonymous</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="text-xs text-gray-600 whitespace-nowrap">
                              {formatDate(errorLog.createdAt.toString())}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setSelectedError(errorLog)}
                                  >
                                    <Eye className="h-3 w-3" />
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
                                    {(() => {
                                      const naturalDescription = generateNaturalLanguageDescription(errorLog);
                                      return (
                                        <div>
                                          <h4 className="font-medium mb-2">What Happened</h4>
                                          <div className="bg-blue-50 p-3 rounded text-sm space-y-2">
                                            <p className="text-blue-900">{naturalDescription.description}</p>
                                            <div className="pt-2 border-t border-blue-200">
                                              <span className="font-medium text-blue-800">Impact on Users:</span>
                                              <p className="text-blue-800 mt-1">{naturalDescription.impact}</p>
                                            </div>
                                            <div className="flex items-center gap-2 pt-2">
                                              <span className="font-medium text-blue-800">Severity:</span>
                                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                naturalDescription.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                                                naturalDescription.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                                                naturalDescription.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                              }`}>
                                                {naturalDescription.severity}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    <div>
                                      <h4 className="font-medium mb-2">Technical Details</h4>
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
                                      <h4 className="font-medium mb-2">Error Message</h4>
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

                                    <div>
                                      <h4 className="font-medium mb-2">Additional Data</h4>
                                      <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                                        <pre>{errorLog.additionalData ? String(JSON.stringify(errorLog.additionalData, null, 2)) : 'No additional data'}</pre>
                                      </div>
                                    </div>
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => analyzeErrorMutation.mutate(errorLog)}
                              disabled={analyzeErrorMutation.isPending}
                              className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                            >
                              <Wrench className="h-4 w-4 mr-1" />
                              {analyzeErrorMutation.isPending ? "Analyzing..." : "Analyze & Fix"}
                            </Button>
                          </div>
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

        {/* Stats Cards */}
        <div className="px-6">
        <div className="grid grid-cols-5 gap-4 mt-6 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold">{errorLogs.length}</div>
            <div className="text-sm text-gray-600">Total Errors</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.javascript_error || 0}</div>
            <div className="text-sm text-gray-600">JavaScript</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.network_error || 0}</div>
            <div className="text-sm text-gray-600">Network</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.click_failure || 0}</div>
            <div className="text-sm text-gray-600">Click Failures</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.form_submission_error || 0}</div>
            <div className="text-sm text-gray-600">Form Errors</div>
          </Card>
        </div>
        </div>
      </div>

      {/* Fix Verification Dialog */}
      <Dialog open={showFixDialog} onOpenChange={setShowFixDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-600" />
              Error Fix Analysis & Verification
            </DialogTitle>
            <DialogDescription>
              Review the suggested fix and confirm it has been tested and verified before marking as resolved.
            </DialogDescription>
          </DialogHeader>
          
          {analyzedFix && currentError && (
            <div className="space-y-6">
              {/* Natural Language Description */}
              {analyzedFix.errorDescription && (
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    What Happened
                  </h4>
                  <p className="text-sm text-blue-900 mb-3">
                    {analyzedFix.errorDescription.naturalLanguage}
                  </p>
                  <div className="text-xs space-y-1">
                    <div><strong>User Impact:</strong> {analyzedFix.errorDescription.userImpact}</div>
                    <div><strong>Severity:</strong> {analyzedFix.errorDescription.severity}</div>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Technical Details</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Error Type:</strong> {currentError.errorType.replace(/_/g, ' ')}</div>
                  <div><strong>Page:</strong> {currentError.page}</div>
                  {analyzedFix.errorDescription && (
                    <div><strong>Technical Summary:</strong> {analyzedFix.errorDescription.technicalSummary}</div>
                  )}
                  <div><strong>Raw Message:</strong> <code className="text-xs bg-white p-1 rounded">{currentError.message}</code></div>
                </div>
              </div>

              {/* Fix Analysis */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Recommended Fix</h4>
                  <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                    <p className="text-sm">{analyzedFix.fixDescription}</p>
                  </div>
                </div>

                {analyzedFix.fixActions && analyzedFix.fixActions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Suggested Actions</h4>
                    <ul className="text-sm space-y-1 ml-4">
                      {analyzedFix.fixActions.map((action: string, index: number) => (
                        <li key={index} className="list-disc">{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyzedFix.recommendation && (
                  <div>
                    <h4 className="font-medium mb-2">Technical Recommendation</h4>
                    <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                      <p className="text-sm">{analyzedFix.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Verification Notes */}
              <div className="space-y-2">
                <Label htmlFor="verification-notes">Verification Notes</Label>
                <Textarea
                  id="verification-notes"
                  placeholder="Describe how you tested the fix and confirmed the error is resolved..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Required: Describe the testing steps taken to verify this error no longer occurs
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFixDialog(false);
                    setAnalyzedFix(null);
                    setCurrentError(null);
                    setVerificationNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!verificationNotes.trim()) {
                      toast({
                        title: "Verification Required",
                        description: "Please describe how you tested and verified the fix",
                        variant: "destructive",
                      });
                      return;
                    }
                    markFixedMutation.mutate({
                      errorId: currentError.id,
                      fixDescription: analyzedFix.fixDescription,
                      verificationNotes: verificationNotes.trim(),
                    });
                  }}
                  disabled={markFixedMutation.isPending || !verificationNotes.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {markFixedMutation.isPending ? "Marking as Fixed..." : "Mark as Fixed"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}