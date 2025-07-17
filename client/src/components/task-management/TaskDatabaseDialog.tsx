import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, CheckSquare, Calendar, Users, Briefcase, Target, Star, Clock } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  templateType: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TaskDatabaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

const DATABASE_TEMPLATES = [
  {
    id: "custom",
    name: "Custom Database",
    description: "Start from scratch with a blank database",
    icon: "🗄️",
    color: "#6B7280",
  },
  {
    id: "project_tasks",
    name: "Project Tasks",
    description: "Track project milestones and deliverables",
    icon: "📋",
    color: "#3B82F6",
  },
  {
    id: "production_checklist",
    name: "Production Checklist",
    description: "Pre-show and technical preparation tasks",
    icon: "✅",
    color: "#10B981",
  },
  {
    id: "rehearsal_schedule",
    name: "Rehearsal Schedule",
    description: "Scene work and rehearsal planning",
    icon: "🎭",
    color: "#8B5CF6",
  },
  {
    id: "team_assignments",
    name: "Team Assignments",
    description: "Delegate tasks to cast and crew",
    icon: "👥",
    color: "#F59E0B",
  },
  {
    id: "venue_logistics",
    name: "Venue & Logistics",
    description: "Location setup and technical requirements",
    icon: "🏛️",
    color: "#EF4444",
  },
  {
    id: "budget_tracking",
    name: "Budget Tracking",
    description: "Track expenses and financial tasks",
    icon: "💰",
    color: "#059669",
  },
];

const COLOR_OPTIONS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export function TaskDatabaseDialog({ isOpen, onClose, onSubmit, isLoading }: TaskDatabaseDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6B7280",
      templateType: "custom",
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = DATABASE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      form.setValue("name", template.name);
      form.setValue("description", template.description);
      form.setValue("color", template.color);
      form.setValue("templateType", templateId);
    }
  };

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    form.reset();
    setSelectedTemplate("custom");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task Database</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <h4 className="text-sm font-medium mb-3">Choose a template</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DATABASE_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: template.color }}
                    >
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm">{template.name}</h5>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter database name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this database is for" 
                        rows={3} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            field.value === color ? "border-primary" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Database"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}