import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Database, Table, Calendar, Kanban, List, Grid, Settings, Filter, Plus, Search } from "lucide-react";
import { TaskBoard } from "@/components/task-management/TaskBoard";
import { apiRequest } from "@/lib/queryClient";
import type { TaskDatabase, TaskView } from "@shared/schema";

export function TaskManagement() {
  const [location, navigate] = useLocation();
  const [selectedView, setSelectedView] = useState<TaskView | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Get current project from URL params if available
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = urlParams.get('projectId');

  // Fetch or create the main task database
  const { data: database, isLoading: loadingDatabase } = useQuery({
    queryKey: ['/api/task-databases', 'main', projectId || 'global'],
    queryFn: async () => {
      // Try to fetch existing database first
      const response = await apiRequest('GET', `/api/task-databases${projectId ? `?projectId=${projectId}` : ''}`);
      const data = await response.json();
      const databases = Array.isArray(data) ? data : [];
      
      // Look for existing main database
      let mainDatabase = databases.find((db: TaskDatabase) => 
        db.name === 'Tasks' && (projectId ? db.projectId === parseInt(projectId) : db.isGlobal)
      );
      
      // If no main database exists, create one
      if (!mainDatabase) {
        const createResponse = await apiRequest('POST', '/api/task-databases', {
          name: 'Tasks',
          description: 'Main task database',
          color: '#3B82F6',
          templateType: 'custom',
          projectId: projectId ? parseInt(projectId) : null,
          isGlobal: !projectId
        });
        mainDatabase = await createResponse.json();
      }
      
      console.log('Main database created/fetched:', mainDatabase);
      return mainDatabase;
    },
    staleTime: 0, // Always refetch to get fresh data
    cacheTime: 0  // Don't cache results
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
      <div className="container mx-auto px-4 py-8">
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
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold">Tasks</h1>
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
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Views */}
            {views.length > 0 && (
              <div className="flex items-center space-x-2 mt-4">
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
        </div>

        {/* Task Board */}
        <div className="flex-1 overflow-hidden">
          <TaskBoard 
            database={database} 
            view={selectedView || views.find(v => v.isDefault) || views[0]}
            isCreateTaskOpen={isCreateTaskOpen}
            onCreateTaskClose={() => setIsCreateTaskOpen(false)}
            onCreateTaskOpen={() => setIsCreateTaskOpen(true)}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    );
  }

  // Fallback if no database is found
  return (
    <div className="container mx-auto px-4 py-8">
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