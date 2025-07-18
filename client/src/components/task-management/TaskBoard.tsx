import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Calendar, User, Tag, Clock } from "lucide-react";
import { TaskTableView } from "./views/TaskTableView";
import { TaskKanbanView } from "./views/TaskKanbanView";
import { TaskCalendarView } from "./views/TaskCalendarView";
import { TaskDialog } from "./TaskDialog";
import { apiRequest } from "@/lib/queryClient";
import type { TaskDatabase, TaskView, Task, TaskProperty } from "@shared/schema";

interface PropertyVisibility {
  id: number;
  name: string;
  type: string;
  icon: any;
  visible: boolean;
  required: boolean;
}

interface TaskBoardProps {
  database: TaskDatabase;
  view?: TaskView;
  isCreateTaskOpen?: boolean;
  onCreateTaskClose?: () => void;
  onCreateTaskOpen?: () => void;
  searchQuery?: string;
  newTaskId?: number | null;
  propertyVisibility?: PropertyVisibility[];
  onPropertyReorder?: (properties: PropertyVisibility[]) => void;
  projectId?: number;
}

export function TaskBoard({ database, view, isCreateTaskOpen = false, onCreateTaskClose, onCreateTaskOpen, searchQuery = "", newTaskId = null, propertyVisibility = [], onPropertyReorder, projectId }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  // Fetch tasks for this database
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['/api/task-databases', database.id, 'tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/task-databases/${database.id}/tasks`);
      const result = await response.json();
      console.log('Tasks fetched for database:', database.id, 'Project:', projectId, 'Tasks:', result);
      return result;
    }
  });

  // Fetch properties for this database
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['/api/task-databases', database.id, 'properties'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/task-databases/${database.id}/properties`);
      return await response.json();
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/task-databases/${database.id}/tasks`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database.id, 'tasks'] });
      onCreateTaskClose?.();
    }
  });

  // Update task mutation with optimistic updates
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('Mutation sending to server:', { id, data });
      const response = await apiRequest('PUT', `/api/tasks/${id}`, data);
      const result = await response.json();
      console.log('Server response:', result);
      return result;
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/task-databases', database.id, 'tasks'] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['/api/task-databases', database.id, 'tasks']);
      
      // Optimistically update the cache
      queryClient.setQueryData(['/api/task-databases', database.id, 'tasks'], (old: any[]) => {
        return old?.map((task: any) => 
          task.id === id 
            ? { ...task, ...data, updatedAt: new Date().toISOString() }
            : task
        ) || [];
      });
      
      // Return context with snapshot
      return { previousTasks };
    },
    onError: (err, { id, data }, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/task-databases', database.id, 'tasks'], context.previousTasks);
      }
      console.error('Update error:', err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database.id, 'tasks'] });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/tasks/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database.id, 'tasks'] });
    }
  });

  // Filter tasks based on search query and project ID (when in show context)
  const filteredTasks = tasks.filter((task: Task) => {
    // Search query filtering
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.content && task.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Project filtering: if projectId is provided (show context), only show tasks for that project
    const matchesProject = projectId 
      ? (task.properties?.project === projectId.toString())
      : true; // Show all tasks when not in a show context
    
    // Debug logging
    if (projectId) {
      console.log('Filtering debug:', {
        taskTitle: task.title,
        taskProject: task.properties?.project,
        expectedProjectId: projectId.toString(),
        matchesProject,
        matchesSearch
      });
    }
    
    return matchesSearch && matchesProject;
  });

  const handleCreateTask = (data: any) => {
    console.log('Creating task with database:', database);
    console.log('Database ID:', database.id);
    console.log('Task data:', data);
    createTaskMutation.mutate(data);
  };

  const handleUpdateTask = (id: number, data: any) => {
    updateTaskMutation.mutate({ id, data });
  };

  const handleDeleteTask = (id: number) => {
    deleteTaskMutation.mutate(id);
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  // Get the task to edit when newTaskId is provided
  const taskToEdit = newTaskId ? tasks.find(task => task.id === newTaskId) : null;



  // Render the appropriate view based on view type
  const renderView = () => {
    const viewType = view?.type || 'table';

    switch (viewType) {
      case 'kanban':
        return (
          <TaskKanbanView
            tasks={filteredTasks}
            properties={properties}
            onTaskUpdate={handleUpdateTask}
            onTaskDelete={handleDeleteTask}
            onTaskSelect={handleTaskSelect}
          />
        );
      case 'calendar':
        return (
          <TaskCalendarView
            tasks={filteredTasks}
            properties={properties}
            onTaskUpdate={handleUpdateTask}
            onTaskSelect={handleTaskSelect}
          />
        );
      case 'table':
      default:
        return (
          <TaskTableView
            tasks={filteredTasks}
            properties={properties}
            onTaskUpdate={handleUpdateTask}
            onTaskDelete={handleDeleteTask}
            onTaskSelect={handleTaskSelect}
            propertyVisibility={propertyVisibility}
            onPropertyReorder={onPropertyReorder}
          />
        );
    }
  };

  if (loadingTasks || loadingProperties) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {filteredTasks.length === 0 && !searchQuery ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first task to get started
              </p>
              <Button onClick={() => onCreateTaskOpen?.()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>
        ) : filteredTasks.length === 0 && searchQuery ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search query
              </p>
            </div>
          </div>
        ) : (
          renderView()
        )}
      </div>

      {/* Create/Edit New Task Dialog */}
      {(isCreateTaskOpen && taskToEdit) && (
        <TaskDialog
          isOpen={isCreateTaskOpen}
          onClose={() => onCreateTaskClose?.()}
          onSubmit={(data) => {
            handleUpdateTask(taskToEdit.id, data);
            onCreateTaskClose?.();
          }}
          task={taskToEdit}
          properties={properties}
          isLoading={updateTaskMutation.isPending}
          onTaskUpdate={handleUpdateTask}
          onDelete={() => {
            handleDeleteTask(taskToEdit.id);
            onCreateTaskClose?.();
          }}
        />
      )}

      {/* Edit Task Dialog */}
      {selectedTask && (
        <TaskDialog
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSubmit={(data) => {
            handleUpdateTask(selectedTask.id, data);
            setSelectedTask(null);
          }}
          task={selectedTask}
          properties={properties}
          isLoading={updateTaskMutation.isPending}
          onTaskUpdate={handleUpdateTask}
          onDelete={() => {
            handleDeleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}