import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Upload,
  Copy,
  Check,
  Trash2,
  FileSpreadsheet,
  Calendar,
  Users,
  List,
  Clock,
  Theater,
} from "lucide-react";
import type { DocumentTemplate } from "@shared/schema";

interface DocumentTemplatesSectionProps {
  projectId: number;
}

interface TemplateVariable {
  key: string;
  description: string;
  example: string;
}

const DOCUMENT_TYPES = [
  { id: 'report', name: 'Reports', icon: FileText, description: 'Rehearsal reports, performance reports, etc.' },
  { id: 'daily_call', name: 'Daily Calls', icon: Clock, description: 'Daily call sheets with call times' },
  { id: 'contacts', name: 'Contacts', icon: Users, description: 'Contact lists and personnel directories' },
  { id: 'running_order', name: 'Running Order', icon: List, description: 'Scene running orders and cue sheets' },
  { id: 'cast_list', name: 'Cast List', icon: Theater, description: 'Cast member lists with character assignments' },
  { id: 'crew_list', name: 'Crew List', icon: Users, description: 'Crew member lists with departments' },
  { id: 'schedule', name: 'Schedule', icon: Calendar, description: 'Weekly schedules and rehearsal calendars' },
];

export function DocumentTemplatesSection({ projectId }: DocumentTemplatesSectionProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>('report');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    file: null as File | null,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ['/api/projects', projectId, 'document-templates'],
    enabled: !!projectId,
  });

  const { data: variables = [], isLoading: variablesLoading } = useQuery<TemplateVariable[]>({
    queryKey: ['/api/projects', projectId, 'document-template-variables', selectedType],
    enabled: !!projectId && !!selectedType,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/projects/${projectId}/document-templates`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'document-templates'] });
      setUploadDialogOpen(false);
      setUploadForm({ name: '', description: '', file: null });
      toast({ title: 'Template uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest('DELETE', `/api/document-templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'document-templates'] });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      toast({ title: 'Template deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Delete failed', variant: 'destructive' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest('POST', `/api/projects/${projectId}/document-templates/${templateId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'document-templates'] });
      toast({ title: 'Template activated' });
    },
    onError: () => {
      toast({ title: 'Activation failed', variant: 'destructive' });
    },
  });

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.name) {
      toast({ title: 'Please provide a name and file', variant: 'destructive' });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('name', uploadForm.name);
    formData.append('description', uploadForm.description);
    formData.append('documentType', selectedType);

    uploadMutation.mutate(formData);
  };

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  const templatesForType = templates.filter(t => t.documentType === selectedType);
  const selectedTypeInfo = DOCUMENT_TYPES.find(t => t.id === selectedType);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Document Templates</h3>
        <p className="text-sm text-muted-foreground">
          Upload custom Word (.docx) or Excel (.xlsx) templates to use when exporting documents. 
          Use the variables below in your template to automatically fill in data from your show.
        </p>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {DOCUMENT_TYPES.map((type) => {
            const Icon = type.icon;
            const hasTemplate = templates.some(t => t.documentType === type.id && t.isActive);
            return (
              <TabsTrigger 
                key={type.id} 
                value={type.id}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {type.name}
                {hasTemplate && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">Active</Badge>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {DOCUMENT_TYPES.map((type) => (
          <TabsContent key={type.id} value={type.id} className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <type.icon className="h-5 w-5" />
                    {type.name} Templates
                  </CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {templatesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading templates...</p>
                  ) : templatesForType.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No templates uploaded yet. Upload a template to customize your {type.name.toLowerCase()} exports.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {templatesForType.map((template) => (
                        <div 
                          key={template.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {template.fileType === 'docx' ? (
                              <FileText className="h-5 w-5 text-blue-500" />
                            ) : (
                              <FileSpreadsheet className="h-5 w-5 text-green-500" />
                            )}
                            <div>
                              <p className="font-medium">{template.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {template.originalFileName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {template.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => activateMutation.mutate(template.id)}
                                disabled={activateMutation.isPending}
                              >
                                Set Active
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTemplateToDelete(template);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button 
                    onClick={() => setUploadDialogOpen(true)}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Variables</CardTitle>
                  <CardDescription>
                    Copy these variables and paste them into your template. They will be replaced with actual data when you export.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {variablesLoading ? (
                      <p className="text-sm text-muted-foreground">Loading variables...</p>
                    ) : variables.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No variables available for this document type.</p>
                    ) : (
                      <div className="space-y-2">
                        {variables.map((variable) => (
                          <div 
                            key={variable.key}
                            className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0 mr-2">
                              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                {variable.key}
                              </code>
                              <p className="text-sm text-muted-foreground mt-1">
                                {variable.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Example: <span className="italic">{variable.example}</span>
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(variable.key)}
                              className="shrink-0"
                            >
                              {copiedKey === variable.key ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload {selectedTypeInfo?.name} Template</DialogTitle>
            <DialogDescription>
              Upload a Word (.docx) or Excel (.xlsx) file with variables like {"{{show.title}}"} that will be replaced with your show data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Standard Rehearsal Report"
                value={uploadForm.name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Textarea
                id="template-description"
                placeholder="Brief description of this template..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-file">Template File</Label>
              <Input
                id="template-file"
                type="file"
                accept=".docx,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setUploadForm(prev => ({ ...prev, file }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: .docx (Word), .xlsx (Excel)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !uploadForm.file || !uploadForm.name}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
