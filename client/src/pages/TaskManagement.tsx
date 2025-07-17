import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Database, Table, Calendar, Kanban, List, Grid, Settings, Filter } from "lucide-react";
import { TaskDatabaseDialog } from "@/components/task-management/TaskDatabaseDialog";
import { TaskBoard } from "@/components/task-management/TaskBoard";
import { apiRequest } from "@/lib/queryClient";
import type { TaskDatabase, TaskView } from "@shared/schema";

export function TaskManagement() {
  const [location, navigate] = useLocation();
  const [selectedDatabase, setSelectedDatabase] = useState<TaskDatabase | null>(null);
  const [selectedView, setSelectedView] = useState<TaskView | null>(null);
  const [isCreateDatabaseOpen, setIsCreateDatabaseOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get current project from URL params if available
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = urlParams.get('projectId');

  // Fetch task databases
  const { data: databases = [], isLoading: loadingDatabases } = useQuery({
    queryKey: ['/api/task-databases', projectId],
    queryFn: () => apiRequest(`/api/task-databases?${projectId ? `projectId=${projectId}` : ''}`)
  });

  // Fetch views for selected database
  const { data: views = [], isLoading: loadingViews } = useQuery({
    queryKey: ['/api/task-databases', selectedDatabase?.id, 'views'],
    queryFn: () => apiRequest(`/api/task-databases/${selectedDatabase?.id}/views`),
    enabled: !!selectedDatabase
  });

  // Create database mutation
  const createDatabaseMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating database with data:', data);
      try {
        const response = await apiRequest('/api/task-databases', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('API response:', response);
        return response;
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('Database created successfully:', result);
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases'] });
      setIsCreateDatabaseOpen(false);
    },
    onError: (error) => {
      console.error('Database creation failed:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
    }
  });

  // Delete database mutation
  const deleteDatabaseMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/task-databases/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases'] });
      if (selectedDatabase?.id === arguments[0]) {
        setSelectedDatabase(null);
        setSelectedView(null);
      }
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

  const handleDatabaseSelect = (database: TaskDatabase) => {
    setSelectedDatabase(database);
    setSelectedView(null);
  };

  const handleCreateDatabase = (data: any) => {
    createDatabaseMutation.mutate({
      ...data,
      projectId: projectId ? parseInt(projectId) : null,
      isGlobal: !projectId
    });
  };

  if (loadingDatabases) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If a database is selected, show the task board
  if (selectedDatabase) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedDatabase(null)}
                  className="px-2"
                >
                  ← Back
                </Button>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: selectedDatabase.color }}
                  >
                    {selectedDatabase.icon || <Database className="h-3 w-3" />}
                  </div>
                  <h1 className="text-2xl font-bold">{selectedDatabase.name}</h1>
                  {selectedDatabase.isGlobal && (
                    <Badge variant="secondary">Global</Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
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
            database={selectedDatabase} 
            view={selectedView || views.find(v => v.isDefault) || views[0]}
          />
        </div>
      </div>
    );
  }

  // Main databases list view
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
        </div>
        <Button onClick={() => setIsCreateDatabaseOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Database
        </Button>
      </div>

      {databases.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No databases yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first task database to get started with project management
          </p>
          <Button onClick={() => setIsCreateDatabaseOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Database
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databases.map((database: TaskDatabase) => (
            <Card 
              key={database.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleDatabaseSelect(database)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: database.color }}
                    >
                      {database.icon ? (
                        <span className="text-lg">{database.icon}</span>
                      ) : (
                        <Database className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{database.name}</CardTitle>
                      {database.isGlobal && (
                        <Badge variant="secondary" className="mt-1">Global</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDatabaseMutation.mutate(database.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {database.description && (
                  <p className="text-sm text-muted-foreground">{database.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>
                    {database.templateType && `Template: ${database.templateType}`}
                  </span>
                  <span>
                    {new Date(database.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TaskDatabaseDialog
        isOpen={isCreateDatabaseOpen}
        onClose={() => setIsCreateDatabaseOpen(false)}
        onSubmit={handleCreateDatabase}
        isLoading={createDatabaseMutation.isPending}
      />
    </div>
  );
}

export default TaskManagement;