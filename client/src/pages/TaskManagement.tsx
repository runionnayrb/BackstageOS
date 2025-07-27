import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Database, Table, Calendar, Kanban, List, Grid, Settings, Filter, Plus, Search, Text, Hash, ArrowUpDown, CalendarDays, Building, User } from "lucide-react";
import { TaskBoard } from "@/components/task-management/TaskBoard";
import { TaskViewSettings } from "@/components/task-management/TaskViewSettings";
import { apiRequest } from "@/lib/queryClient";
import type { TaskDatabase, TaskView } from "@shared/schema";
import { FloatingActionButton } from "@/components/navigation/floating-action-button";
import { setPageHeaderIcons, clearPageHeaderIcons } from "@/hooks/useHeaderIcons";

interface PropertyVisibility {
  id: number;
  name: string;
  type: string;
  icon: any;
  visible: boolean;
  required: boolean;
}

export function TaskManagement() {
  const [location, navigate] = useLocation();
  const [selectedView, setSelectedView] = useState<TaskView | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTaskId, setNewTaskId] = useState<number | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Extract show ID from URL if we're in show context
  const showMatch = location.match(/^\/shows\/(\d+)\/tasks/);
  const showId = showMatch ? showMatch[1] : null;
  
  // Fetch show data if we're in show context
  const { data: showData } = useQuery({
    queryKey: ['/api/projects', showId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/projects/${showId}`);
      return await response.json();
    },
    enabled: !!showId
  });

  // Property visibility state
  const [propertyVisibility, setPropertyVisibility] = useState<PropertyVisibility[]>([
    { id: 1, name: 'Task Name', type: 'text', icon: Text, visible: true, required: true },
    { id: 2, name: 'Status', type: 'select', icon: Hash, visible: true, required: false },
    { id: 3, name: 'Priority', type: 'select', icon: ArrowUpDown, visible: true, required: false },
    { id: 4, name: 'Due Date', type: 'date', icon: CalendarDays, visible: true, required: false },
    { id: 5, name: 'Show', type: 'relation', icon: Building, visible: true, required: false },
    { id: 6, name: 'Assignee', type: 'person', icon: User, visible: true, required: false },
    { id: 7, name: 'Created', type: 'date', icon: CalendarDays, visible: false, required: false },
    { id: 8, name: 'Updated', type: 'date', icon: CalendarDays, visible: false, required: false },
  ]);

  // Update property visibility based on context - hide Project column when in show context
  useEffect(() => {
    setPropertyVisibility(prev => 
      prev.map(prop => 
        prop.name === 'Show' 
          ? { ...prop, visible: !showId } 
          : prop
      )
    );
  }, [showId]);

  // Get current project from URL params if available, or use showId
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = showId || urlParams.get('projectId');

  // Fetch the main task database - use database ID 3 which contains your existing tasks
  const { data: database, isLoading: loadingDatabase, error: databaseError } = useQuery({
    queryKey: ['/api/task-databases', 3],
    queryFn: async () => {
      console.log('Fetching task database ID 3 directly...');
      try {
        // Directly fetch database ID 3 which contains your tasks
        const response = await fetch(`/api/task-databases/3`, {
          credentials: 'same-origin'
        });
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const database = await response.json();
        console.log('Found database 3:', database);
        return database;
      } catch (error) {
        console.error('Error fetching database 3:', error);
        // Fallback: try to get all databases and find database 3
        console.log('Fallback: Fetching all databases...');
        try {
          const response = await fetch(`/api/task-databases`, {
            credentials: 'same-origin'
          });
          if (response.ok) {
            const databases = await response.json();
            const db3 = databases.find((db: TaskDatabase) => db.id === 3);
            if (db3) {
              console.log('Found database 3 in list:', db3);
              return db3;
            }
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes  
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
    retry: 2,                  // Retry failed requests
    retryDelay: 1000
  });

  // Fetch views for the main database
  const { data: views = [], isLoading: loadingViews } = useQuery({
    queryKey: ['/api/task-databases', database?.id, 'views'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/task-databases/${database?.id}/views`);
      return await response.json();
    },
    enabled: !!database?.id
  });

  // Create view mutation
  const createViewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/task-databases/${database?.id}/views`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database?.id, 'views'] });
    }
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/task-databases/${database?.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: "New Task",
          content: "",
          properties: {
            status: "not_started",
            priority: "medium",
            project: showId || "none",
            assignee: currentUser?.id || null
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }
      
      const newTask = await response.json();
      return newTask;
    },
    onSuccess: (newTask) => {
      // Update the cache immediately with the new task to make it available
      queryClient.setQueryData(['/api/task-databases', database?.id, 'tasks'], (oldData: any[]) => {
        const updated = oldData ? [...oldData, newTask] : [newTask];
        return updated;
      });
      
      // Set the state
      setNewTaskId(newTask.id);
      setIsCreateTaskOpen(true);
      
      // Force refresh tasks to ensure they show up
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database?.id, 'tasks'] });
      queryClient.refetchQueries({ queryKey: ['/api/task-databases', database?.id, 'tasks'] });
    },
    onError: (error) => {
      console.error('Task creation failed:', error);
    }
  });

  const handleCreateTask = () => {
    if (database?.id) {
      createTaskMutation.mutate();
    } else {
      console.error('No database ID available for task creation');
    }
  };
  
  // Set header icons for mobile - search, filter, and settings
  useEffect(() => {
    // Create settings component for header
    const SettingsComponent = () => (
      <TaskViewSettings
        currentView={selectedView?.type || 'table'}
        onViewChange={(viewType) => {
          const tempView = { ...selectedView, type: viewType } as TaskView;
          setSelectedView(tempView);
        }}
        propertyVisibility={propertyVisibility}
        onPropertyVisibilityChange={setPropertyVisibility}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className="hover:bg-transparent group h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4 group-hover:text-blue-600" />
        </Button>
      </TaskViewSettings>
    );

    setPageHeaderIcons([
      {
        icon: Filter,
        onClick: () => {}, // TODO: Add filter functionality
        title: 'Filter tasks'
      },
      {
        icon: Settings,
        component: SettingsComponent,
        title: 'Task settings'
      }
    ]);
    
    return () => {
      clearPageHeaderIcons();
    };
  }, [selectedView, propertyVisibility, isSearchExpanded]);

  const getViewIcon = (type: string) => {
    switch (type) {
      case 'table': return <Table className="h-4 w-4" />;
      case 'kanban': return <Kanban className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'gallery': return <Grid className="h-4 w-4" />;
      case 'timeline': return <List className="h-4 w-4" />;
      default: return <Table className="h-4 w-4" />;
    }
  };

  // Show loading state
  if (loadingDatabase) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (databaseError) {
    console.error('Database error:', databaseError);
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Tasks</h3>
          <p className="text-muted-foreground mb-4">
            There was an issue accessing your task database.
          </p>
          <p className="text-sm text-red-500 mb-4">
            {databaseError instanceof Error ? databaseError.message : 'Unknown error'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="mx-auto"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // Show task board directly
  if (database) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Desktop Title */}
            <h2 className="hidden md:block text-2xl font-bold text-gray-900">
              {showId && showData ? `Tasks - ${showData.name}` : 'Tasks'}
            </h2>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-2">
              {/* Expandable Search */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isSearchExpanded ? 'w-64 opacity-100' : 'w-0 opacity-0'
              }`}>
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-muted-foreground"
                  autoFocus={isSearchExpanded}
                  onBlur={() => {
                    if (!searchQuery) {
                      setIsSearchExpanded(false);
                    }
                  }}
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                className="hover:bg-transparent group"
              >
                <Search className="h-4 w-4 group-hover:text-blue-600" />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-transparent group">
                <Filter className="h-4 w-4 group-hover:text-blue-600" />
              </Button>
              <TaskViewSettings
                currentView={selectedView?.type || 'table'}
                onViewChange={(viewType) => {
                  const tempView = { ...selectedView, type: viewType } as TaskView;
                  setSelectedView(tempView);
                }}
                propertyVisibility={propertyVisibility}
                onPropertyVisibilityChange={setPropertyVisibility}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-transparent group"
                >
                  <Settings className="h-4 w-4 group-hover:text-blue-600" />
                </Button>
              </TaskViewSettings>
              <Button variant="ghost" size="sm" onClick={handleCreateTask} className="hover:bg-transparent group">
                <Plus className="h-4 w-4 group-hover:text-blue-600" />
              </Button>
            </div>


          </div>
          
          {/* Mobile Search Bar */}
          {isSearchExpanded && (
            <div className="md:hidden mb-4">
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                autoFocus
                onBlur={() => {
                  if (!searchQuery) {
                    setIsSearchExpanded(false);
                  }
                }}
              />
            </div>
          )}

          {/* Views */}
          {views.length > 0 && (
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm text-muted-foreground">Views:</span>
              {views.map((view) => (
                <Button
                  key={view.id}
                  variant={selectedView?.id === view.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedView(view)}
                  className="h-8"
                >
                  {getViewIcon(view.type)}
                  <span className="ml-2">{view.name}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Task Board */}
        <div className="flex-1 overflow-hidden">
          <TaskBoard 
            database={database} 
            view={selectedView || views.find(v => v.isDefault) || views[0]}
            isCreateTaskOpen={isCreateTaskOpen}
            onCreateTaskClose={() => {
              setIsCreateTaskOpen(false);
              setNewTaskId(null);
            }}
            onCreateTaskOpen={() => setIsCreateTaskOpen(true)}
            searchQuery={searchQuery}
            newTaskId={newTaskId}
            propertyVisibility={propertyVisibility}
            onPropertyReorder={setPropertyVisibility}
            projectId={showId ? parseInt(showId) : undefined}
          />
        </div>
        
        {/* Floating Action Button - Mobile Only */}
        <FloatingActionButton onClick={handleCreateTask} />
      </div>
    );
  }

  // Fallback if no database is found
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="text-center py-12">
        <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Setting up your task database</h3>
        <p className="text-muted-foreground mb-4">
          Please wait while we prepare your task management system...
        </p>
      </div>
    </div>
  );
}

export default TaskManagement;