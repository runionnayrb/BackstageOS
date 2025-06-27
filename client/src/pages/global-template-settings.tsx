import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  ArrowLeft,
  Save,
  Settings,
  FileText,
  Type,
  Layout,
  Mail,
  Clock,
  Calendar,
  Eye,
  Edit3,
  Bold,
  Italic,
  Underline,
  Plus,
  X,
  Image,
  Hash,
  Calendar as CalendarIcon
} from "lucide-react";

interface GlobalTemplateSettingsParams {
  id: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  venue?: string;
}

interface GlobalTemplateSettings {
  id?: string;
  projectId: number;
  
  // Branding
  branding: {
    productionLogo?: string; // Base64 or URL
    productionPhoto?: string; // Base64 or URL
    logoPosition: "header-left" | "header-center" | "header-right" | "footer-left" | "footer-center" | "footer-right";
    logoSize: "small" | "medium" | "large";
    showProductionPhoto: boolean;
    photoPosition: "header" | "footer" | "watermark";
  };
  
  // Page Layout
  pageMargins: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  pageNumbering: {
    enabled: boolean;
    format: "1" | "1 of X" | "Page 1" | "Page 1 of X";
    position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  };
  
  // Typography
  fonts: {
    heading: {
      family: string;
      size: string;
      weight: "normal" | "bold" | "600" | "700";
      lineHeight: string;
    };
    body: {
      family: string;
      size: string;
      weight: "normal" | "400" | "500";
      lineHeight: string;
    };
  };
  
  // List Formatting
  lists: {
    numbered: {
      spacing: string;
      indentation: string;
      style: "1." | "1)" | "(1)" | "I." | "A.";
    };
    bulleted: {
      spacing: string;
      indentation: string;
      style: "•" | "◦" | "▪" | "-" | "*";
    };
  };
  
  // Date & Time Formatting
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "Month DD, YYYY" | "DD Month YYYY";
  timeFormat: "12h" | "24h";
  
  // Default Header & Footer with Rich HTML Content
  defaultHeader: string;
  defaultFooter: string;
  
  // Email Settings
  email: {
    distributionLists: {
      to: string[];
      cc: string[];
      bcc: string[];
    };
    subjectTemplate: string;
    bodyTemplate: string;
    signature: string;
  };
}

const defaultGlobalSettings: Omit<GlobalTemplateSettings, "id" | "projectId"> = {
  branding: {
    logoPosition: "header-left",
    logoSize: "medium",
    showProductionPhoto: false,
    photoPosition: "header"
  },
  pageMargins: {
    top: "1in",
    bottom: "1in", 
    left: "1in",
    right: "1in"
  },
  pageNumbering: {
    enabled: true,
    format: "Page 1 of X",
    position: "bottom-center"
  },
  fonts: {
    heading: {
      family: "Arial, sans-serif",
      size: "18px",
      weight: "bold",
      lineHeight: "1.4"
    },
    body: {
      family: "Arial, sans-serif", 
      size: "12px",
      weight: "normal",
      lineHeight: "1.6"
    }
  },
  lists: {
    numbered: {
      spacing: "6px",
      indentation: "20px",
      style: "1."
    },
    bulleted: {
      spacing: "6px", 
      indentation: "20px",
      style: "•"
    }
  },
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  defaultHeader: '<div style="text-align: center; font-weight: bold;">{{showName}} - {{reportType}}<br>Date: {{date}}<br>Stage Manager: {{stageManager}}</div>',
  defaultFooter: '<div style="text-align: center; color: #666666;">Prepared by: {{preparedBy}}<br>Next report: {{nextReportDate}}</div>',
  email: {
    distributionLists: {
      to: [],
      cc: [],
      bcc: []
    },
    subjectTemplate: "{{showName}} - {{reportType}} - {{date}}",
    bodyTemplate: "Please find attached the {{reportType}} for {{showName}}.\n\nBest regards,\n{{stageManager}}",
    signature: ""
  }
};

export default function GlobalTemplateSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<GlobalTemplateSettingsParams>();
  const projectId = params.id;
  
  const [settings, setSettings] = useState<GlobalTemplateSettings>({
    ...defaultGlobalSettings,
    projectId: parseInt(projectId!)
  });

  const [previewMode, setPreviewMode] = useState<'header' | 'footer' | null>(null);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: globalSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/global-template-settings`],
  });

  const showName = project?.name || "Loading...";

  useEffect(() => {
    if (globalSettings) {
      setSettings(prev => ({
        ...prev,
        ...globalSettings
      }));
    }
  }, [globalSettings]);

  const saveSettings = useMutation({
    mutationFn: async (settingsData: GlobalTemplateSettings) => {
      if (settingsData.id) {
        await apiRequest("PATCH", `/api/projects/${projectId}/global-template-settings/${settingsData.id}`, settingsData);
      } else {
        await apiRequest("POST", `/api/projects/${projectId}/global-template-settings`, settingsData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Global template settings saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/global-template-settings`] });
    },
    onError: (error) => {
      console.error("Settings save error:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const addEmailAddress = (listType: "to" | "cc" | "bcc", email: string) => {
    if (email.trim()) {
      setSettings(prev => ({
        ...prev,
        email: {
          ...prev.email,
          distributionLists: {
            ...prev.email.distributionLists,
            [listType]: [...prev.email.distributionLists[listType], email.trim()]
          }
        }
      }));
    }
  };

  const removeEmailAddress = (listType: "to" | "cc" | "bcc", index: number) => {
    setSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        distributionLists: {
          ...prev.email.distributionLists,
          [listType]: prev.email.distributionLists[listType].filter((_, i) => i !== index)
        }
      }
    }));
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {(project as any)?.name || "Show"}
          </Button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Global Template Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure default formatting and layout for all report templates
            </p>
          </div>
          <Button
            onClick={() => saveSettings.mutate(settings)}
            disabled={saveSettings.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="formatting">Formatting</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Production Branding
                </CardTitle>
                <CardDescription>Upload and configure production logo and photos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Production Logo</Label>
                  <div className="mt-2 space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {settings.branding.productionLogo ? (
                        <div className="space-y-2">
                          <img 
                            src={settings.branding.productionLogo} 
                            alt="Production Logo" 
                            className="max-h-24 mx-auto"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              branding: { ...prev.branding, productionLogo: undefined }
                            }))}
                          >
                            Remove Logo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Upload production logo (PNG, JPG, SVG)
                          </p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setSettings(prev => ({
                                    ...prev,
                                    branding: { ...prev.branding, productionLogo: e.target?.result as string }
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Logo Position</Label>
                        <Select
                          value={settings.branding.logoPosition}
                          onValueChange={(value: any) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, logoPosition: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="header-left">Header Left</SelectItem>
                            <SelectItem value="header-center">Header Center</SelectItem>
                            <SelectItem value="header-right">Header Right</SelectItem>
                            <SelectItem value="footer-left">Footer Left</SelectItem>
                            <SelectItem value="footer-center">Footer Center</SelectItem>
                            <SelectItem value="footer-right">Footer Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Logo Size</Label>
                        <Select
                          value={settings.branding.logoSize}
                          onValueChange={(value: any) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, logoSize: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Production Photo</Label>
                  <div className="mt-2 space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {settings.branding.productionPhoto ? (
                        <div className="space-y-2">
                          <img 
                            src={settings.branding.productionPhoto} 
                            alt="Production Photo" 
                            className="max-h-32 mx-auto rounded"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              branding: { ...prev.branding, productionPhoto: undefined }
                            }))}
                          >
                            Remove Photo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Upload production photo (PNG, JPG)
                          </p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setSettings(prev => ({
                                    ...prev,
                                    branding: { ...prev.branding, productionPhoto: e.target?.result as string }
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.branding.showProductionPhoto}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, showProductionPhoto: checked }
                          }))}
                        />
                        <Label>Show production photo in reports</Label>
                      </div>
                      
                      {settings.branding.showProductionPhoto && (
                        <div className="space-y-2">
                          <Label>Photo Position</Label>
                          <Select
                            value={settings.branding.photoPosition}
                            onValueChange={(value: any) => setSettings(prev => ({
                              ...prev,
                              branding: { ...prev.branding, photoPosition: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="header">Header</SelectItem>
                              <SelectItem value="footer">Footer</SelectItem>
                              <SelectItem value="watermark">Watermark</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Page Layout
                </CardTitle>
                <CardDescription>Configure page margins and numbering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Page Margins</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label>Top</Label>
                      <Input
                        value={settings.pageMargins.top}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          pageMargins: { ...prev.pageMargins, top: e.target.value }
                        }))}
                        placeholder="1in"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bottom</Label>
                      <Input
                        value={settings.pageMargins.bottom}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          pageMargins: { ...prev.pageMargins, bottom: e.target.value }
                        }))}
                        placeholder="1in"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Left</Label>
                      <Input
                        value={settings.pageMargins.left}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          pageMargins: { ...prev.pageMargins, left: e.target.value }
                        }))}
                        placeholder="1in"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Right</Label>
                      <Input
                        value={settings.pageMargins.right}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          pageMargins: { ...prev.pageMargins, right: e.target.value }
                        }))}
                        placeholder="1in"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Page Numbering</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.pageNumbering.enabled}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        pageNumbering: { ...prev.pageNumbering, enabled: checked }
                      }))}
                    />
                    <Label>Enable page numbering</Label>
                  </div>
                  
                  {settings.pageNumbering.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Select
                          value={settings.pageNumbering.format}
                          onValueChange={(value: any) => setSettings(prev => ({
                            ...prev,
                            pageNumbering: { ...prev.pageNumbering, format: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="1 of X">1 of X</SelectItem>
                            <SelectItem value="Page 1">Page 1</SelectItem>
                            <SelectItem value="Page 1 of X">Page 1 of X</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Select
                          value={settings.pageNumbering.position}
                          onValueChange={(value: any) => setSettings(prev => ({
                            ...prev,
                            pageNumbering: { ...prev.pageNumbering, position: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top-left">Top Left</SelectItem>
                            <SelectItem value="top-center">Top Center</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            <SelectItem value="bottom-center">Bottom Center</SelectItem>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="typography" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Typography
                </CardTitle>
                <CardDescription>Configure fonts and text formatting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Heading Font</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select
                        value={settings.fonts.heading.family}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            heading: { ...prev.fonts.heading, family: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                          <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                          <SelectItem value="Calibri, sans-serif">Calibri</SelectItem>
                          <SelectItem value="Georgia, serif">Georgia</SelectItem>
                          <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Input
                        value={settings.fonts.heading.size}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            heading: { ...prev.fonts.heading, size: e.target.value }
                          }
                        }))}
                        placeholder="18px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight</Label>
                      <Select
                        value={settings.fonts.heading.weight}
                        onValueChange={(value: any) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            heading: { ...prev.fonts.heading, weight: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="600">Semi-bold</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="700">Extra Bold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Line Height</Label>
                      <Input
                        value={settings.fonts.heading.lineHeight}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            heading: { ...prev.fonts.heading, lineHeight: e.target.value }
                          }
                        }))}
                        placeholder="1.4"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Body Font</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select
                        value={settings.fonts.body.family}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            body: { ...prev.fonts.body, family: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                          <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                          <SelectItem value="Calibri, sans-serif">Calibri</SelectItem>
                          <SelectItem value="Georgia, serif">Georgia</SelectItem>
                          <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Input
                        value={settings.fonts.body.size}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            body: { ...prev.fonts.body, size: e.target.value }
                          }
                        }))}
                        placeholder="12px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight</Label>
                      <Select
                        value={settings.fonts.body.weight}
                        onValueChange={(value: any) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            body: { ...prev.fonts.body, weight: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="400">Regular</SelectItem>
                          <SelectItem value="500">Medium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Line Height</Label>
                      <Input
                        value={settings.fonts.body.lineHeight}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          fonts: {
                            ...prev.fonts,
                            body: { ...prev.fonts.body, lineHeight: e.target.value }
                          }
                        }))}
                        placeholder="1.6"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formatting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>List Formatting</CardTitle>
                <CardDescription>Configure spacing and styling for lists</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Numbered Lists</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select
                        value={settings.lists.numbered.style}
                        onValueChange={(value: any) => setSettings(prev => ({
                          ...prev,
                          lists: {
                            ...prev.lists,
                            numbered: { ...prev.lists.numbered, style: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.">1.</SelectItem>
                          <SelectItem value="1)">1)</SelectItem>
                          <SelectItem value="(1)">(1)</SelectItem>
                          <SelectItem value="I.">I.</SelectItem>
                          <SelectItem value="A.">A.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Spacing</Label>
                      <Input
                        value={settings.lists.numbered.spacing}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          lists: {
                            ...prev.lists,
                            numbered: { ...prev.lists.numbered, spacing: e.target.value }
                          }
                        }))}
                        placeholder="6px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Indentation</Label>
                      <Input
                        value={settings.lists.numbered.indentation}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          lists: {
                            ...prev.lists,
                            numbered: { ...prev.lists.numbered, indentation: e.target.value }
                          }
                        }))}
                        placeholder="20px"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Bullet Lists</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select
                        value={settings.lists.bulleted.style}
                        onValueChange={(value: any) => setSettings(prev => ({
                          ...prev,
                          lists: {
                            ...prev.lists,
                            bulleted: { ...prev.lists.bulleted, style: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="•">• (Bullet)</SelectItem>
                          <SelectItem value="◦">◦ (Circle)</SelectItem>
                          <SelectItem value="▪">▪ (Square)</SelectItem>
                          <SelectItem value="-">- (Dash)</SelectItem>
                          <SelectItem value="*">* (Asterisk)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Spacing</Label>
                      <Input
                        value={settings.lists.bulleted.spacing}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          lists: {
                            ...prev.lists,
                            bulleted: { ...prev.lists.bulleted, spacing: e.target.value }
                          }
                        }))}
                        placeholder="6px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Indentation</Label>
                      <Input
                        value={settings.lists.bulleted.indentation}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          lists: {
                            ...prev.lists,
                            bulleted: { ...prev.lists.bulleted, indentation: e.target.value }
                          }
                        }))}
                        placeholder="20px"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date & Time Formatting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={settings.dateFormat}
                      onValueChange={(value: any) => setSettings(prev => ({
                        ...prev,
                        dateFormat: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="Month DD, YYYY">Month DD, YYYY</SelectItem>
                        <SelectItem value="DD Month YYYY">DD Month YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time Format</Label>
                    <Select
                      value={settings.timeFormat}
                      onValueChange={(value: any) => setSettings(prev => ({
                        ...prev,
                        timeFormat: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Default Headers & Footers
                </CardTitle>
                <CardDescription>Set default header and footer templates for new reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Header Formatting */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Default Header Template</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewMode(previewMode === 'header' ? null : 'header')}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {previewMode === 'header' ? 'Hide Preview' : 'Preview'}
                      </Button>

                    </div>
                  </div>

                  {previewMode === 'header' && (
                    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div 
                        dangerouslySetInnerHTML={{
                          __html: settings.defaultHeader.replace(/{{(\w+)}}/g, (match, key) => {
                            const sampleData: Record<string, string> = {
                              showName: "Sample Show",
                              reportType: "Rehearsal Report",
                              date: new Date().toLocaleDateString(),
                              stageManager: "John Doe",
                              venue: "Sample Theater"
                            };
                            return sampleData[key] || match;
                          })
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Header Content</Label>
                      <RichTextEditor
                        content={settings.defaultHeader}
                        onChange={(content) => setSettings(prev => ({
                          ...prev,
                          defaultHeader: content
                        }))}
                        placeholder="Enter header content with rich formatting..."
                        className="min-h-[120px]"
                        showPageNumbers={true}
                        pageNumberFormat={settings.pageNumbering.format}
                        onPageNumberFormatChange={(format) => setSettings(prev => ({
                          ...prev,
                          pageNumbering: {
                            ...prev.pageNumbering,
                            format: format as "1" | "1 of X" | "Page 1" | "Page 1 of X"
                          }
                        }))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Use variables: {`{{showName}}, {{reportType}}, {{date}}, {{stageManager}}, {{venue}}`} • Use the page number dropdown and Insert button on the right side of the toolbar
                      </p>
                    </div>


                  </div>
                </div>

                {/* Footer Formatting */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Default Footer Template</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewMode(previewMode === 'footer' ? null : 'footer')}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {previewMode === 'footer' ? 'Hide Preview' : 'Preview'}
                      </Button>

                    </div>
                  </div>

                  {previewMode === 'footer' && (
                    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div 
                        dangerouslySetInnerHTML={{
                          __html: settings.defaultFooter.replace(/{{(\w+)}}/g, (match, key) => {
                            const sampleData: Record<string, string> = {
                              preparedBy: "Jane Smith",
                              nextReportDate: new Date(Date.now() + 86400000).toLocaleDateString(),
                              contactInfo: "contact@theater.com",
                              emergencyContact: "(555) 123-4567"
                            };
                            return sampleData[key] || match;
                          })
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Footer Content</Label>
                      <RichTextEditor
                        content={settings.defaultFooter}
                        onChange={(content) => setSettings(prev => ({
                          ...prev,
                          defaultFooter: content
                        }))}
                        placeholder="Enter footer content with rich formatting..."
                        className="min-h-[100px]"
                        showPageNumbers={true}
                        pageNumberFormat={settings.pageNumbering.format}
                        onPageNumberFormatChange={(format) => setSettings(prev => ({
                          ...prev,
                          pageNumbering: {
                            ...prev.pageNumbering,
                            format: format as "1" | "1 of X" | "Page 1" | "Page 1 of X"
                          }
                        }))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Use variables: {`{{preparedBy}}, {{nextReportDate}}, {{contactInfo}}, {{emergencyContact}}`} • Use the page number dropdown and Insert button on the right side of the toolbar
                      </p>
                    </div>


                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Distribution & Templates
                </CardTitle>
                <CardDescription>Configure email settings for sending reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* TO, CC, BCC Lists */}
                {["to", "cc", "bcc"].map((listType) => (
                  <div key={listType} className="space-y-2">
                    <Label className="text-base font-medium">
                      {listType.toUpperCase()} Recipients
                    </Label>
                    <div className="space-y-2">
                      {settings.email.distributionLists[listType as keyof typeof settings.email.distributionLists].map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input value={email} readOnly className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeEmailAddress(listType as "to" | "cc" | "bcc", index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Add ${listType.toUpperCase()} email address`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const target = e.target as HTMLInputElement;
                              addEmailAddress(listType as "to" | "cc" | "bcc", target.value);
                              target.value = "";
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            addEmailAddress(listType as "to" | "cc" | "bcc", input.value);
                            input.value = "";
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Subject Line Template</Label>
                  <Input
                    value={settings.email.subjectTemplate}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, subjectTemplate: e.target.value }
                    }))}
                    placeholder="{{showName}} - {{reportType}} - {{date}}"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Body Template</Label>
                  <Textarea
                    value={settings.email.bodyTemplate}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, bodyTemplate: e.target.value }
                    }))}
                    placeholder="Please find attached the {{reportType}} for {{showName}}.&#10;&#10;Best regards,&#10;{{stageManager}}"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Signature</Label>
                  <Textarea
                    value={settings.email.signature}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, signature: e.target.value }
                    }))}
                    placeholder="Your signature here..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings Preview</CardTitle>
                <CardDescription>Preview how your settings will appear in reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="bg-white border shadow-lg mx-auto p-8 space-y-6"
                  style={{
                    width: "8.5in",
                    fontFamily: settings.fonts.body.family,
                    fontSize: settings.fonts.body.size,
                    lineHeight: settings.fonts.body.lineHeight,
                    margin: `${settings.pageMargins.top} ${settings.pageMargins.right} ${settings.pageMargins.bottom} ${settings.pageMargins.left}`
                  }}
                >
                  {/* Header Preview */}
                  <div className="text-center border-b pb-4">
                    <div 
                      className="whitespace-pre-line"
                      style={{
                        fontFamily: settings.fonts.heading.family,
                        fontSize: settings.fonts.heading.size,
                        fontWeight: settings.fonts.heading.weight,
                        lineHeight: settings.fonts.heading.lineHeight
                      }}
                    >
                      <div 
                        dangerouslySetInnerHTML={{
                          __html: settings.defaultHeader
                            .replace(/\{\{showName\}\}/g, (project as any)?.name || "Show Name")
                            .replace(/\{\{reportType\}\}/g, "Sample Report")
                            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
                            .replace(/\{\{stageManager\}\}/g, "Stage Manager")
                        }}
                      />
                    </div>
                  </div>

                  {/* Sample Content */}
                  <div className="space-y-4">
                    <div>
                      <h3 style={{
                        fontFamily: settings.fonts.heading.family,
                        fontSize: settings.fonts.heading.size,
                        fontWeight: settings.fonts.heading.weight,
                        lineHeight: settings.fonts.heading.lineHeight
                      }}>
                        Sample Section
                      </h3>
                      <p>This is sample body text showing your typography settings.</p>
                    </div>

                    <div>
                      <h4 style={{
                        fontFamily: settings.fonts.heading.family,
                        fontSize: settings.fonts.heading.size,
                        fontWeight: settings.fonts.heading.weight,
                        lineHeight: settings.fonts.heading.lineHeight
                      }}>
                        Numbered List Example:
                      </h4>
                      <ol style={{
                        marginLeft: settings.lists.numbered.indentation,
                        listStyleType: settings.lists.numbered.style === "1." ? "decimal" : "none"
                      }}>
                        <li style={{ marginBottom: settings.lists.numbered.spacing }}>First item</li>
                        <li style={{ marginBottom: settings.lists.numbered.spacing }}>Second item</li>
                        <li style={{ marginBottom: settings.lists.numbered.spacing }}>Third item</li>
                      </ol>
                    </div>

                    <div>
                      <h4 style={{
                        fontFamily: settings.fonts.heading.family,
                        fontSize: settings.fonts.heading.size,
                        fontWeight: settings.fonts.heading.weight,
                        lineHeight: settings.fonts.heading.lineHeight
                      }}>
                        Bullet List Example:
                      </h4>
                      <ul style={{
                        marginLeft: settings.lists.bulleted.indentation,
                        listStyleType: settings.lists.bulleted.style === "•" ? "disc" : "none"
                      }}>
                        <li style={{ marginBottom: settings.lists.bulleted.spacing }}>First bullet</li>
                        <li style={{ marginBottom: settings.lists.bulleted.spacing }}>Second bullet</li>
                        <li style={{ marginBottom: settings.lists.bulleted.spacing }}>Third bullet</li>
                      </ul>
                    </div>
                  </div>

                  {/* Footer Preview */}
                  <div className="text-center border-t pt-4 text-sm text-gray-600">
                    <div 
                      dangerouslySetInnerHTML={{
                        __html: settings.defaultFooter
                          .replace(/\{\{preparedBy\}\}/g, "Stage Manager")
                          .replace(/\{\{nextReportDate\}\}/g, "Tomorrow")
                      }}
                    />
                  </div>

                  {/* Page Number Preview */}
                  {settings.pageNumbering.enabled && (
                    <div 
                      className={`text-sm text-gray-600 ${
                        settings.pageNumbering.position.includes("center") ? "text-center" :
                        settings.pageNumbering.position.includes("right") ? "text-right" : "text-left"
                      }`}
                    >
                      {settings.pageNumbering.format.replace("1", "1").replace("X", "3")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}