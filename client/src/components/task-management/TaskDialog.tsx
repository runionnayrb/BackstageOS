import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Trash2, User, Tag, Clock, Flag, ArrowLeft, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { Task, TaskProperty } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  content: z.string().optional(),
  status: z.string().default("not_started"),
  priority: z.string().default("medium"),
  dueDate: z.date().optional(),
  properties: z.record(z.any()).default({}),
});

type FormData = z.infer<typeof formSchema>;

// Project Assignment Property Component
function ProjectAssignmentProperty({ form }: { form: any }) {
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });



  return (
    <div className="flex items-center space-x-3 py-1">
      <div className="w-24 text-sm text-gray-600 shrink-0">Project</div>
      <FormField
        control={form.control}
        name="properties.project"
        render={({ field }) => (
          <FormItem className="w-auto">
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="border-none shadow-none h-8 px-2 focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:border-none hover:border-none w-auto [&>svg]:hidden [&]:!border-none" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' }}>
                  <SelectValue placeholder="No Project" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-gray-500">No project</span>
                </SelectItem>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  onDelete?: () => void;
  task?: Task;
  properties: TaskProperty[];
  isLoading: boolean;
  onTaskUpdate?: (taskId: number, data: any) => void;
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started", color: "#6B7280" },
  { value: "in_progress", label: "In Progress", color: "#3B82F6" },
  { value: "completed", label: "Completed", color: "#10B981" },
  { value: "blocked", label: "Blocked", color: "#EF4444" },
  { value: "cancelled", label: "Cancelled", color: "#8B5CF6" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "#6B7280", icon: "↓" },
  { value: "medium", label: "Medium", color: "#F59E0B", icon: "→" },
  { value: "high", label: "High", color: "#EF4444", icon: "↑" },
  { value: "urgent", label: "Urgent", color: "#DC2626", icon: "‼️" },
];

export function TaskDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onDelete, 
  task, 
  properties, 
  isLoading,
  onTaskUpdate 
}: TaskDialogProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create debounced update function for real-time title updates
  const debouncedUpdate = useCallback((title: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (task && onTaskUpdate && title !== task.title) {
        onTaskUpdate(task.id, { title });
      }
    }, 300);
  }, [task, onTaskUpdate]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title === "New Task" ? "" : (task?.title || ""),
      content: task?.content || "",
      status: task?.status || "not_started",
      priority: task?.priority || "medium",
      dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
      properties: { 
        ...task?.properties, 
        project: task?.properties?.project === "none" ? undefined : task?.properties?.project 
      },
    },
  });

  const handleSubmit = (data: FormData) => {
    // Ensure empty project field gets saved as "none"
    const processedData = {
      ...data,
      dueDate: data.dueDate?.toISOString(),
      properties: {
        ...data.properties,
        project: data.properties?.project || "none"
      }
    };
    onSubmit(processedData as any);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const renderPropertyField = (property: TaskProperty) => {
    const propertyKey = `properties.${property.name}`;
    
    switch (property.type) {
      case 'text':
        return (
          <FormField
            key={property.id}
            control={form.control}
            name={propertyKey as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{property.name}</FormLabel>
                <FormControl>
                  <Input placeholder={`Enter ${property.name.toLowerCase()}`} {...field} className="border-none shadow-none focus-visible:ring-0 focus:ring-0 focus:outline-none focus:border-none hover:border-none" style={{ border: 'none', outline: 'none' }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'number':
        return (
          <FormField
            key={property.id}
            control={form.control}
            name={propertyKey as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{property.name}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder={`Enter ${property.name.toLowerCase()}`} 
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value) || "")}
                    className="border-none shadow-none focus-visible:ring-0 focus:ring-0 focus:outline-none focus:border-none hover:border-none"
                    style={{ border: 'none', outline: 'none' }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'select':
        const options = property.config?.options || [];
        return (
          <FormField
            key={property.id}
            control={form.control}
            name={propertyKey as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{property.name}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-none shadow-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:border-none hover:border-none" style={{ border: 'none', outline: 'none' }}>
                      <SelectValue placeholder={`Select ${property.name.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'checkbox':
        return (
          <FormField
            key={property.id}
            control={form.control}
            name={propertyKey as any}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    {property.name}
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        );

      case 'date':
        return (
          <FormField
            key={property.id}
            control={form.control}
            name={propertyKey as any}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{property.name}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal border-none shadow-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:border-none hover:border-none"
                        style={{ border: 'none', outline: 'none' }}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString())}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-6">
            {/* Task Title - Notion style */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        placeholder="New Task" 
                        {...field} 
                        className="text-5xl font-bold border-none p-0 shadow-none focus-visible:ring-0 focus:ring-0 focus:outline-none focus:border-none bg-transparent resize-none overflow-hidden min-h-0 w-full"
                        rows={1}
                        style={{ 
                          fontSize: '3rem', 
                          lineHeight: '1.2',
                          fontWeight: 'bold',
                          border: 'none',
                          outline: 'none'
                        }}
                        onChange={(e) => {
                          field.onChange(e);
                          debouncedUpdate(e.target.value);
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Collapsible Properties section - Above content */}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPropertiesCollapsed(!propertiesCollapsed)}
                  className="w-full flex items-center justify-end p-0 h-auto hover:bg-transparent"
                >
                  {propertiesCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
                
                {!propertiesCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {/* Status property */}
                <div className="flex items-center space-x-3 py-1">
                  <div className="w-24 text-sm text-gray-600 shrink-0">Status</div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="w-auto">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-none shadow-none h-8 px-2 focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:border-none hover:border-none w-auto [&>svg]:hidden [&]:!border-none" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' }}>
                              <SelectValue placeholder="Not started" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: option.color }}
                                  />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Priority property */}
                <div className="flex items-center space-x-3 py-1">
                  <div className="w-24 text-sm text-gray-600 shrink-0">Priority</div>
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem className="w-auto">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-none shadow-none h-8 px-2 focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:border-none hover:border-none w-auto [&>svg]:hidden [&]:!border-none" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' }}>
                              <SelectValue placeholder="Medium" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center space-x-2">
                                  <span>{option.icon}</span>
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Due Date property */}
                <div className="flex items-center space-x-3 py-1">
                  <div className="w-24 text-sm text-gray-600 shrink-0">Due Date</div>
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="ghost"
                                className="h-8 px-2 justify-start font-normal border-none shadow-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:border-none hover:border-none"
                                style={{ border: 'none', outline: 'none' }}
                              >
                                {field.value ? (
                                  format(field.value, "MMM d, yyyy")
                                ) : (
                                  <span className="text-gray-500">Empty</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setCalendarOpen(false);
                              }}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Project Assignment property */}
                <ProjectAssignmentProperty form={form} />

                {/* Custom Properties within collapsible section */}
                {properties.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {properties.map(renderPropertyField)}
                  </div>
                )}
                  </div>
                )}
              </div>

              {/* Content area - Now after properties */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Type / to start..." 
                        rows={6} 
                        {...field} 
                        className="border-none shadow-none resize-none focus-visible:ring-0 focus:ring-0 focus:outline-none focus:border-none hover:border-none p-0 text-gray-700"
                        style={{ border: 'none', outline: 'none' }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </form>
        </Form>


      </SheetContent>
    </Sheet>
  );
}