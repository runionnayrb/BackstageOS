import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CalendarIcon, Trash2, User, Tag, Clock, Flag } from "lucide-react";
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

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  onDelete?: () => void;
  task?: Task;
  properties: TaskProperty[];
  isLoading: boolean;
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
  isLoading 
}: TaskDialogProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title || "",
      content: task?.content || "",
      status: task?.status || "not_started",
      priority: task?.priority || "medium",
      dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
      properties: task?.properties || {},
    },
  });

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      dueDate: data.dueDate?.toISOString(),
    } as any);
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
                  <Input placeholder={`Enter ${property.name.toLowerCase()}`} {...field} />
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
                    <SelectTrigger>
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
                        className="w-full pl-3 text-left font-normal"
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? "Edit Task" : "Create New Task"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Task Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add a description..." 
                        rows={4} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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

            {/* Custom Properties */}
            {properties.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Custom Properties</h4>
                <div className="space-y-4">
                  {properties.map(renderPropertyField)}
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <div>
                {task && onDelete && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={onDelete}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : task ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}