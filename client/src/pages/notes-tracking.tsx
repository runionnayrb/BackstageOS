import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  CheckSquare, 
  Clock, 
  User, 
  Calendar,
  ArrowRight,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  RotateCcw,
  ArrowUpDown,
  Check,
  Settings2
} from 'lucide-react';
import type { ReportNote } from '@shared/schema';
import { ManageStatusModal } from '@/components/manage-status-modal';

interface NotesTrackingParams {
  id: string; // project ID
}

const NotesTracking: React.FC = () => {
  const { id: projectId } = useParams<NotesTrackingParams>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedReportType, setSelectedReportType] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<string>('none');
  const [groupOpen, setGroupOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [manageStatusOpen, setManageStatusOpen] = useState(false);

  // Fetch all notes for the project
  const { data: allNotes = [], isLoading } = useQuery<ReportNote[]>({
    queryKey: ['/api/projects', projectId, 'notes-tracking'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/notes/all`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    }
  });

  // Fetch project data for context
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Fetch reports for context
  const { data: reports = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/reports`],
  });

  // Fetch project settings for department names mapping
  const { data: showSettings } = useQuery<{ departmentNames?: Record<string, string> }>({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Update note status mutation with optimistic updates
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, data }: { noteId: number; data: Partial<ReportNote> }) => {
      const response = await fetch(`/api/projects/${projectId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update note');
      return response.json();
    },
    onMutate: async ({ noteId, data }) => {
      // Cancel outgoing refetches to prevent them from overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ['/api/projects', projectId, 'notes-tracking']
      });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData<ReportNote[]>(['/api/projects', projectId, 'notes-tracking']);

      // Optimistically update the cache
      if (previousNotes) {
        queryClient.setQueryData<ReportNote[]>(
          ['/api/projects', projectId, 'notes-tracking'],
          previousNotes.map(note =>
            note.id === noteId
              ? { ...note, ...data }
              : note
          )
        );
      }

      // Return previous state for rollback
      return { previousNotes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(
          ['/api/projects', projectId, 'notes-tracking'],
          context.previousNotes
        );
      }
      toast({ 
        title: 'Error updating note', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    },
    onSuccess: () => {
      // Silent success - UI already updated optimistically
    }
  });

  // Helper function to get report by ID - defined before use
  const getReport = (reportId: number) => {
    return reports.find((r: any) => r.id === reportId);
  };

  // Helper function to get department display name from department key
  const getDepartmentDisplayName = (departmentKey: string | null | undefined): string => {
    if (!departmentKey) return '';
    // Look up the display name from showSettings.departmentNames
    const displayName = showSettings?.departmentNames?.[departmentKey];
    if (displayName) {
      return displayName;
    }
    // Fallback: if it's a "New-dept-" key without a mapping, return a generic name
    if (departmentKey.startsWith('New-dept-')) {
      return 'Department';
    }
    // Otherwise format the key itself (for legacy department names like "lighting", "audio", etc.)
    return departmentKey.charAt(0).toUpperCase() + departmentKey.slice(1).toLowerCase();
  };

  // Helper function to sort notes - defined before use
  const sortNotes = (notes: ReportNote[]) => {
    const sorted = [...notes];
    switch (sortBy) {
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'priority-high':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return sorted.sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 3));
      case 'priority-low':
        const priorityOrderReverse = { low: 0, medium: 1, high: 2 };
        return sorted.sort((a, b) => (priorityOrderReverse[a.priority as keyof typeof priorityOrderReverse] || 3) - (priorityOrderReverse[b.priority as keyof typeof priorityOrderReverse] || 3));
      case 'status':
        return sorted.sort((a, b) => (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0));
      default:
        return sorted;
    }
  };

  // Filter notes based on search and filters
  const filteredNotes = allNotes.filter(note => {
    const report = getReport(note.reportId);
    const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || note.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'completed' && note.isCompleted) ||
      (selectedStatus === 'pending' && !note.isCompleted);
    const matchesPriority = selectedPriority === 'all' || note.priority === selectedPriority;
    const matchesReportType = selectedReportType === 'all' || report?.phase === selectedReportType;
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesPriority && matchesReportType;
  });

  // Group notes by selected grouping or by status
  const getGroupKey = (note: ReportNote) => {
    switch (groupBy) {
      case 'date':
        return new Date(note.createdAt).toLocaleDateString();
      case 'reportType':
        return getReport(note.reportId)?.phase || 'Unknown';
      case 'department':
        return note.department ? getDepartmentDisplayName(note.department) : 'No Department';
      case 'priority':
        return note.priority?.charAt(0).toUpperCase() + note.priority?.slice(1) || 'Medium';
      default:
        return note.isCompleted ? 'Completed' : 'Pending';
    }
  };

  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const key = getGroupKey(note);
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {} as Record<string, ReportNote[]>);

  // Apply sorting to grouped notes
  const sortedGroupedNotes = Object.entries(groupedNotes).reduce((acc, [key, notes]) => {
    acc[key] = sortNotes(notes);
    return acc;
  }, {} as Record<string, ReportNote[]>);

  // Group notes by status
  const pendingNotes = sortNotes(filteredNotes.filter(note => !note.isCompleted));
  const completedNotes = sortNotes(filteredNotes.filter(note => note.isCompleted));

  // Get unique departments
  const departments = Array.from(new Set(allNotes.map(note => note.department).filter(Boolean)));
  
  // Get unique report types
  const reportTypes = Array.from(new Set(
    allNotes
      .map(note => getReport(note.reportId)?.phase)
      .filter(Boolean)
  ));

  const handleToggleComplete = (note: ReportNote) => {
    updateNoteMutation.mutate({
      noteId: note.id,
      data: { isCompleted: !note.isCompleted }
    });
  };

  const handlePriorityChange = (note: ReportNote, newPriority: string) => {
    updateNoteMutation.mutate({
      noteId: note.id,
      data: { priority: newPriority }
    });
  };

  const handleResetFilters = () => {
    setSelectedDepartment('all');
    setSelectedStatus('all');
    setSelectedPriority('all');
    setSelectedReportType('all');
  };

  const handleResetGrouping = () => {
    setGroupBy('none');
  };

  const handleResetSort = () => {
    setSortBy('date-desc');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-3 h-3" />;
      case 'medium': return <Clock className="w-3 h-3" />;
      case 'low': return <CheckCircle2 className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const NoteCard = ({ note }: { note: ReportNote }) => {
    const report = getReport(note.reportId);
    
    return (
      <Card className={`transition-all duration-200 ${note.isCompleted ? 'opacity-75' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox 
              checked={note.isCompleted}
              onCheckedChange={() => handleToggleComplete(note)}
              className="mt-1"
            />
            
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm leading-relaxed ${note.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {note.content}
                </p>
                
                <Select 
                  value={note.priority} 
                  onValueChange={(value) => handlePriorityChange(note, value)}
                >
                  <SelectTrigger className="w-24 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
                
                <Badge variant="outline" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  {report?.title || 'Unknown Report'}
                </Badge>
                
                {note.department && (
                  <Badge variant="outline" className="text-xs">
                    {getDepartmentDisplayName(note.department)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = 
    selectedDepartment !== 'all' || 
    selectedStatus !== 'all' || 
    selectedPriority !== 'all' || 
    selectedReportType !== 'all';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Notes</h2>
          <p className="text-gray-600 mb-3">
            Track and follow up on all notes from {project?.name || 'this project'}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              {pendingNotes.length} pending
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              {completedNotes.length} completed
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Animated Search Bar */}
          <div className={`flex items-center transition-all duration-300 overflow-hidden ${
            searchOpen ? 'w-48' : 'w-0'
          }`}>
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => setSearchOpen(false)}
              autoFocus
              className="h-8 text-sm"
            />
          </div>

          {/* Search Icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            className="h-8 w-8 text-gray-600 hover:text-gray-900"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Group Icon */}
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${
                  groupBy !== 'none'
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Layers className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Group By
                  </h4>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetGrouping}
                      className="h-8 w-8 p-0"
                      title="Reset grouping"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGroupOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2" style={{ color: '#000000' }}>
                {['date', 'reportType', 'department', 'priority'].map((option) => (
                  <div
                    key={option}
                    className={`p-3 rounded cursor-pointer transition-colors flex items-center justify-between ${
                      groupBy === option ? 'bg-blue-100 hover:bg-blue-150' : 'hover:bg-blue-50'
                    }`}
                    onClick={() => {
                      setGroupBy(option);
                      setGroupOpen(false);
                    }}
                    style={{ color: '#000000' }}
                  >
                    <div className="text-sm capitalize" style={{ color: '#000000' }}>
                      {option === 'reportType' ? 'Report Type' : option}
                    </div>
                    {groupBy === option && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort Icon */}
          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${
                  sortBy !== 'date-desc'
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort By
                  </h4>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetSort}
                      className="h-8 w-8 p-0"
                      title="Reset sort"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSortOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2" style={{ color: '#000000' }}>
                {[
                  { value: 'date-desc', label: 'Date (Newest)' },
                  { value: 'date-asc', label: 'Date (Oldest)' },
                  { value: 'priority-high', label: 'Priority (High)' },
                  { value: 'priority-low', label: 'Priority (Low)' },
                  { value: 'status', label: 'Status' }
                ].map((option) => (
                  <div
                    key={option.value}
                    className={`p-3 rounded cursor-pointer transition-colors flex items-center justify-between ${
                      sortBy === option.value ? 'bg-blue-100 hover:bg-blue-150' : 'hover:bg-blue-50'
                    }`}
                    onClick={() => {
                      setSortBy(option.value);
                      setSortOpen(false);
                    }}
                    style={{ color: '#000000' }}
                  >
                    <div className="text-sm" style={{ color: '#000000' }}>{option.label}</div>
                    {sortBy === option.value && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Filter Icon */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${
                  hasActiveFilters
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter By
                </h4>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-8 w-8 p-0"
                    title="Reset filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Report Type</label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All report types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All report types</SelectItem>
                    {reportTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Department</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{getDepartmentDisplayName(dept)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Priority</label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </PopoverContent>
          </Popover>

          {/* Manage Status Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setManageStatusOpen(true)}
            data-testid="button-manage-status"
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Manage Status
          </Button>
        </div>
      </div>
      {/* Notes Display */}
      {groupBy === 'none' ? (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pending ({pendingNotes.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({completedNotes.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-3">
            {pendingNotes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-500">No pending notes to follow up on.</p>
                </CardContent>
              </Card>
            ) : (
              pendingNotes.map(note => (
                <NoteCard key={note.id} note={note} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-3">
            {completedNotes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No completed notes</h3>
                  <p className="text-gray-500">Completed notes will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              completedNotes.map(note => (
                <NoteCard key={note.id} note={note} />
              ))
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {Object.entries(sortedGroupedNotes).map(([group, notes]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">{group}</h3>
              <div className="space-y-3">
                {notes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manage Status Modal */}
      <ManageStatusModal
        projectId={projectId || ''}
        isOpen={manageStatusOpen}
        onClose={() => setManageStatusOpen(false)}
      />
    </div>
  );
};

export default NotesTracking;