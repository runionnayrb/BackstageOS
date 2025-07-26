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

  // Fetch the main task database - prioritize existing database with tasks
  const { data: database, isLoading: loadingDatabase } = useQuery({
    queryKey: ['/api/task-databases', 'main'],
    queryFn: async () => {
      // Fetch all databases to find the one with existing tasks
      const response = await apiRequest('GET', `/api/task-databases`);
      const data = await response.json();
      const databases = Array.isArray(data) ? data : [];
      
      // First, try to find an existing global database that has tasks
      let mainDatabase = databases.find((db: TaskDatabase) => 
        db.name === 'Tasks' && db.isGlobal && db.id === 3
      );
      
      // If that specific database exists, use it (it contains your existing tasks)
      if (mainDatabase) {
        console.log('Found existing database with tasks:', mainDatabase);
        return mainDatabase;
      }
      
      // Otherwise, find any global main database
      mainDatabase = databases.find((db: TaskDatabase) => 
        db.name === 'Tasks' && db.isGlobal
      );
      
      // If still no global main database exists, create one
      if (!mainDatabase) {
        const createResponse = await apiRequest('POST', '/api/task-databases', {
          name: 'Tasks',
          description: 'Main task database',
          color: '#3B82F6',
          templateType: 'custom',
          projectId: null,
          isGlobal: true
        });
        mainDatabase = await createResponse.json();
      }
      
      console.log('Main database resolved:', mainDatabase);
      return mainDatabase;
    },
    staleTime: Infinity, // Cache the result since we want consistency
    gcTime: Infinity  // Keep in cache to prevent recreation
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
      const response = await apiRequest('POST', `/api/task-databases/${database?.id}/tasks`, {
        title: "New Task",
        content: "",
        properties: {
          status: "not_started",
          priority: "medium",
          project: showId || "none",
          assignee: currentUser?.id || null
        }
      });
      return await response.json();
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database?.id, 'tasks'] });
      setNewTaskId(newTask.id);
      setIsCreateTaskOpen(true);
    }
  });

  const handleCreateTask = () => {
    if (database?.id) {
      createTaskMutation.mutate();
    }
  };

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

  // Show task board directly
  if (database) {
    return (
      <div className="h-full flex flex-col">
        {/* Header - matching Reports page structure */}
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {showId && showData ? `Tasks - ${showData.name}` : 'Tasks'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
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
                  // Create a temporary view object to change the view
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