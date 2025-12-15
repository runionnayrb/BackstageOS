import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Mail,
  Download
} from "lucide-react";
import { DistroManager } from "./DistroManager";

interface GlobalTemplateSettings {
  id?: string;
  projectId: number;
  
  branding: {
    productionLogo?: string;
    productionPhoto?: string;
    logoPosition: "header-left" | "header-center" | "header-right" | "footer-left" | "footer-center" | "footer-right";
    logoSize: "small" | "medium" | "large";
    showProductionPhoto: boolean;
    photoPosition: "header" | "footer" | "watermark";
  };
  
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
  
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "Month DD, YYYY" | "DD Month YYYY";
  timeFormat: "12h" | "24h";
  
  defaultHeader: string;
  defaultFooter: string;
  headerSpacing: string;
  footerSpacing: string;
  headerHorizontalLine: boolean;
  footerHorizontalLine: boolean;
  
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
  
  pdfExport: {
    fontFamily: "helvetica" | "times" | "courier";
    titleSize: number;
    showNameSize: number;
    sectionTitleSize: number;
    fieldTitleSize: number;
    contentSize: number;
    lineHeight: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
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
  defaultHeader: '{{showName}}, {{reportType}}, {{date}}',
  defaultFooter: 'Page {{pageNumber}} of {{totalPages}}',
  headerSpacing: "1.2",
  footerSpacing: "1.2",
  headerHorizontalLine: false,
  footerHorizontalLine: false,
  email: {
    distributionLists: {
      to: [],
      cc: [],
      bcc: []
    },
    subjectTemplate: "{{showName}} - {{reportType}} - {{date}}",
    bodyTemplate: "Please find attached the {{reportType}} for {{showName}}.\n\nBest regards,\n{{stageManager}}",
    signature: ""
  },
  pdfExport: {
    fontFamily: "helvetica",
    titleSize: 18,
    showNameSize: 16,
    sectionTitleSize: 13,
    fieldTitleSize: 12,
    contentSize: 11,
    lineHeight: 1.4,
    marginTop: 0.5,
    marginBottom: 0.5,
    marginLeft: 1,
    marginRight: 1
  }
};

interface GlobalTemplateSettingsContentProps {
  projectId: string;
  showSaveButton?: boolean;
}

export interface GlobalTemplateSettingsRef {
  save: () => void;
  isPending: boolean;
}

export const GlobalTemplateSettingsContent = forwardRef<GlobalTemplateSettingsRef, GlobalTemplateSettingsContentProps>(
  ({ projectId, showSaveButton = true }, ref) => {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<GlobalTemplateSettings>({
    ...defaultGlobalSettings,
    projectId: parseInt(projectId!)
  });

  const { data: globalSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/global-template-settings`],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (globalSettings) {
      setSettings(prev => ({
        ...prev,
        ...globalSettings,
        branding: globalSettings.branding || prev.branding,
        pageMargins: globalSettings.pageMargins || prev.pageMargins,
        pageNumbering: globalSettings.pageNumbering || prev.pageNumbering,
        fonts: globalSettings.fonts || prev.fonts,
        lists: globalSettings.lists || prev.lists,
        email: globalSettings.email || prev.email,
        pdfExport: globalSettings.pdfExport || prev.pdfExport,
        headerSpacing: globalSettings.headerSpacing || prev.headerSpacing,
        footerSpacing: globalSettings.footerSpacing || prev.footerSpacing,
        headerHorizontalLine: globalSettings.headerHorizontalLine !== undefined ? globalSettings.headerHorizontalLine : prev.headerHorizontalLine,
        footerHorizontalLine: globalSettings.footerHorizontalLine !== undefined ? globalSettings.footerHorizontalLine : prev.footerHorizontalLine
      }));
    }
  }, [globalSettings]);

  const saveSettings = useMutation({
    mutationFn: async (data: { settingsData: GlobalTemplateSettings, showToast?: boolean }) => {
      const { settingsData, showToast = false } = data;
      const { id, createdAt, updatedAt, ...cleanData } = settingsData as any;
      
      const transformedData = {
        projectId: cleanData.projectId,
        branding: cleanData.branding,
        pageMargins: cleanData.pageMargins,
        pageNumbering: cleanData.pageNumbering,
        fonts: cleanData.fonts,
        lists: cleanData.lists,
        dateFormat: cleanData.dateFormat,
        timeFormat: cleanData.timeFormat,
        defaultHeader: cleanData.defaultHeader,
        defaultFooter: cleanData.defaultFooter,
        headerSpacing: cleanData.headerSpacing,
        footerSpacing: cleanData.footerSpacing,
        headerHorizontalLine: cleanData.headerHorizontalLine,
        footerHorizontalLine: cleanData.footerHorizontalLine,
        email: cleanData.email,
        pdfExport: cleanData.pdfExport,
        productionLogo: cleanData.branding?.productionLogo || null,
        productionPhoto: cleanData.branding?.productionPhoto || null,
      };
      
      await apiRequest("POST", `/api/projects/${projectId}/global-template-settings`, transformedData);
      
      if (cleanData.pageMargins) {
        await apiRequest("PUT", `/api/projects/${projectId}/settings/global-margins`, {
          pageMargins: cleanData.pageMargins
        });
      }
      
      return { showToast };
    },
    onSuccess: (result) => {
      if (result?.showToast) {
        toast({
          title: "Settings Saved",
          description: "Global template settings and margins updated successfully",
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/global-template-settings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/settings`] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to save settings";
      toast({
        title: "Error",
        description: errorMessage,
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

  useImperativeHandle(ref, () => ({
    save: () => {
      saveSettings.mutate({ settingsData: settings, showToast: true });
    },
    isPending: saveSettings.isPending
  }));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pdf" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf">PDF Export</TabsTrigger>
          <TabsTrigger value="email">Distro</TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                PDF Export Settings
              </CardTitle>
              <CardDescription>Configure how reports are exported to PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Font Settings</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={settings.pdfExport?.fontFamily || "helvetica"}
                      onValueChange={(value: "helvetica" | "times" | "courier") => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, fontFamily: value }
                      }))}
                    >
                      <SelectTrigger data-testid="select-pdf-font-family">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Line Height</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      value={settings.pdfExport?.lineHeight || 1.4}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, lineHeight: parseFloat(e.target.value) || 1.4 }
                      }))}
                      data-testid="input-pdf-line-height"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Font Sizes (points)</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>Report Title</Label>
                    <Input
                      type="number"
                      min="8"
                      max="36"
                      value={settings.pdfExport?.titleSize || 18}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, titleSize: parseInt(e.target.value) || 18 }
                      }))}
                      data-testid="input-pdf-title-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Show Name</Label>
                    <Input
                      type="number"
                      min="8"
                      max="36"
                      value={settings.pdfExport?.showNameSize || 16}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, showNameSize: parseInt(e.target.value) || 16 }
                      }))}
                      data-testid="input-pdf-show-name-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section Title</Label>
                    <Input
                      type="number"
                      min="8"
                      max="36"
                      value={settings.pdfExport?.sectionTitleSize || 13}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, sectionTitleSize: parseInt(e.target.value) || 13 }
                      }))}
                      data-testid="input-pdf-section-title-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Field Title</Label>
                    <Input
                      type="number"
                      min="8"
                      max="36"
                      value={settings.pdfExport?.fieldTitleSize || 12}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, fieldTitleSize: parseInt(e.target.value) || 12 }
                      }))}
                      data-testid="input-pdf-field-title-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Input
                      type="number"
                      min="8"
                      max="36"
                      value={settings.pdfExport?.contentSize || 11}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, contentSize: parseInt(e.target.value) || 11 }
                      }))}
                      data-testid="input-pdf-content-size"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Page Margins (inches)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>Top</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3"
                      value={settings.pdfExport?.marginTop || 0.5}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, marginTop: parseFloat(e.target.value) || 0.5 }
                      }))}
                      data-testid="input-pdf-margin-top"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bottom</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3"
                      value={settings.pdfExport?.marginBottom || 0.5}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, marginBottom: parseFloat(e.target.value) || 0.5 }
                      }))}
                      data-testid="input-pdf-margin-bottom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Left</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3"
                      value={settings.pdfExport?.marginLeft || 1}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, marginLeft: parseFloat(e.target.value) || 1 }
                      }))}
                      data-testid="input-pdf-margin-left"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Right</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3"
                      value={settings.pdfExport?.marginRight || 1}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pdfExport: { ...prev.pdfExport, marginRight: parseFloat(e.target.value) || 1 }
                      }))}
                      data-testid="input-pdf-margin-right"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  These settings control how your reports appear when downloaded as PDF. The default values are optimized for professional stage management reports.
                </p>
              </div>
            </CardContent>
          </Card>
          {showSaveButton && (
            <div className="flex justify-end">
              <Button
                onClick={() => saveSettings.mutate({ settingsData: settings, showToast: true })}
                disabled={saveSettings.isPending}
                className="flex items-center gap-2"
                data-testid="btn-save-pdf-settings"
              >
                <Save className="h-4 w-4" />
                Save PDF Settings
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <DistroManager projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
});
