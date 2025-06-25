import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, Settings, Star, Users } from "lucide-react";

const reportSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Template type is required"),
  date: z.string().min(1, "Date is required"),
  content: z.record(z.any()),
});

type ReportFormData = z.infer<typeof reportSchema>;

export default function ReportBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      projectId: "",
      title: "",
      type: "",
      date: new Date().toISOString().split('T')[0],
      content: {},
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      await apiRequest("POST", "/api/reports", {
        ...data,
        projectId: parseInt(data.projectId),
        date: new Date(data.date),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Created",
        description: "Your report has been created successfully!",
      });
      setLocation("/reports");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const templates = [
    {
      id: "rehearsal",
      name: "Rehearsal Report",
      description: "Daily rehearsal notes and updates",
      icon: Clock,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "tech",
      name: "Tech Report",
      description: "Technical rehearsal progress",
      icon: Settings,
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "performance",
      name: "Performance Report",
      description: "Show performance notes",
      icon: Star,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "meeting",
      name: "Production Meeting",
      description: "Meeting minutes and action items",
      icon: Users,
      color: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    form.setValue("type", templateId);
    
    // Update title placeholder based on template
    const template = templates.find(t => t.id === templateId);
    if (template) {
      form.setValue("title", `${template.name} #1`);
    }
  };

  const onSubmit = (data: ReportFormData) => {
    mutation.mutate(data);
  };

  const renderTemplateFields = () => {
    if (!selectedTemplate) return null;

    const commonFields = (
      <div>
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          rows={3}
          placeholder="Brief summary of today's activities..."
          onChange={(e) => form.setValue("content.summary", e.target.value)}
        />
      </div>
    );

    switch (selectedTemplate) {
      case "rehearsal":
        return (
          <>
            {commonFields}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  onChange={(e) => form.setValue("content.startTime", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  onChange={(e) => form.setValue("content.endTime", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="scenesRehearsed">Scenes Rehearsed</Label>
              <Input
                id="scenesRehearsed"
                placeholder="e.g., Act 1 Scenes 1-3"
                onChange={(e) => form.setValue("content.scenesRehearsed", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Detailed rehearsal notes..."
                onChange={(e) => form.setValue("content.notes", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nextRehearsal">Next Rehearsal</Label>
              <Textarea
                id="nextRehearsal"
                rows={2}
                placeholder="Plans for the next rehearsal..."
                onChange={(e) => form.setValue("content.nextRehearsal", e.target.value)}
              />
            </div>
          </>
        );
      
      case "tech":
        return (
          <>
            {commonFields}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="techFocus">Tech Focus</Label>
                <Select onValueChange={(value) => form.setValue("content.techFocus", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select focus area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lighting">Lighting</SelectItem>
                    <SelectItem value="sound">Sound</SelectItem>
                    <SelectItem value="set-changes">Set Changes</SelectItem>
                    <SelectItem value="costumes">Costumes</SelectItem>
                    <SelectItem value="props">Props</SelectItem>
                    <SelectItem value="full-technical">Full Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="completionStatus">Completion Status</Label>
                <Select onValueChange={(value) => form.setValue("content.completionStatus", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on-schedule">On Schedule</SelectItem>
                    <SelectItem value="behind-schedule">Behind Schedule</SelectItem>
                    <SelectItem value="ahead-schedule">Ahead of Schedule</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="technicalIssues">Technical Issues</Label>
              <Textarea
                id="technicalIssues"
                rows={3}
                placeholder="List any technical issues encountered..."
                onChange={(e) => form.setValue("content.technicalIssues", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nextSessionGoals">Next Session Goals</Label>
              <Textarea
                id="nextSessionGoals"
                rows={2}
                placeholder="Goals for the next tech session..."
                onChange={(e) => form.setValue("content.nextSessionGoals", e.target.value)}
              />
            </div>
          </>
        );
      
      case "performance":
        return (
          <>
            {commonFields}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="showTime">Show Time</Label>
                <Input
                  id="showTime"
                  type="time"
                  onChange={(e) => form.setValue("content.showTime", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="houseCount">House Count</Label>
                <Input
                  id="houseCount"
                  type="number"
                  placeholder="0"
                  onChange={(e) => form.setValue("content.houseCount", parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="houseCapacity">House Capacity</Label>
                <Input
                  id="houseCapacity"
                  type="number"
                  placeholder="0"
                  onChange={(e) => form.setValue("content.houseCapacity", parseInt(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="performanceNotes">Performance Notes</Label>
              <Textarea
                id="performanceNotes"
                rows={4}
                placeholder="Notes about the performance..."
                onChange={(e) => form.setValue("content.performanceNotes", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="issues">Issues/Incidents</Label>
              <Textarea
                id="issues"
                rows={3}
                placeholder="Any issues or incidents during the show..."
                onChange={(e) => form.setValue("content.issues", e.target.value)}
              />
            </div>
          </>
        );
      
      case "meeting":
        return (
          <>
            {commonFields}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="meetingType">Meeting Type</Label>
                <Select onValueChange={(value) => form.setValue("content.meetingType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production Meeting</SelectItem>
                    <SelectItem value="design">Design Meeting</SelectItem>
                    <SelectItem value="tech">Tech Meeting</SelectItem>
                    <SelectItem value="cast">Cast Meeting</SelectItem>
                    <SelectItem value="crew">Crew Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="attendees">Attendees</Label>
                <Input
                  id="attendees"
                  placeholder="Number of attendees"
                  onChange={(e) => form.setValue("content.attendees", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="agendaItems">Agenda Items</Label>
              <Textarea
                id="agendaItems"
                rows={3}
                placeholder="Main topics discussed..."
                onChange={(e) => form.setValue("content.agendaItems", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="actionItems">Action Items</Label>
              <Textarea
                id="actionItems"
                rows={3}
                placeholder="Tasks assigned and deadlines..."
                onChange={(e) => form.setValue("content.actionItems", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nextMeeting">Next Meeting</Label>
              <Input
                id="nextMeeting"
                type="datetime-local"
                onChange={(e) => form.setValue("content.nextMeeting", e.target.value)}
              />
            </div>
          </>
        );
      
      default:
        return commonFields;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Builder</h2>
          <p className="text-gray-600">Create and customize production reports</p>
        </div>

        {/* Template Selection */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      isSelected 
                        ? 'border-primary bg-blue-50' 
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <div className={`p-2 ${template.color} rounded-lg w-fit mb-3`}>
                      <Icon className={`w-6 h-6 ${template.iconColor}`} />
                    </div>
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Report Form */}
        <Card>
          <CardContent className="p-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select onValueChange={(value) => form.setValue("projectId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.projectId && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.projectId.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    {...form.register("date")}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="title">Report Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Rehearsal Report #5"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Dynamic Template Fields */}
              <div className="space-y-6">
                {renderTemplateFields()}
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/reports")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedTemplate}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedTemplate}
                >
                  Preview PDF
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending || !selectedTemplate}
                >
                  {mutation.isPending ? "Creating..." : "Generate Report"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
