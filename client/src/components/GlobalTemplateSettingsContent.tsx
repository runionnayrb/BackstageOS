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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Save,
  FileText,
  Type,
  Layout,
  Mail,
  ChevronUp,
  ChevronDown,
  Download
} from "lucide-react";

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
      {showSaveButton && (
        <div className="flex justify-end">
          <Button
            onClick={() => saveSettings.mutate({ settingsData: settings, showToast: true })}
            disabled={saveSettings.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      )}

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="formatting">Formatting</TabsTrigger>
          <TabsTrigger value="headers">Header & Footer</TabsTrigger>
          <TabsTrigger value="pdf">PDF Export</TabsTrigger>
          <TabsTrigger value="email">Distro</TabsTrigger>
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
                    {settings.branding?.productionLogo ? (
                      <div className="space-y-2">
                        <img 
                          src={settings.branding?.productionLogo} 
                          alt="Production Logo" 
                          className="max-h-24 mx-auto"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            branding: { ...(prev.branding || {}), productionLogo: undefined }
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
                                  branding: { ...(prev.branding || {}), productionLogo: e.target?.result as string }
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
                        value={settings.branding?.logoPosition}
                        onValueChange={(value: any) => setSettings(prev => ({
                          ...prev,
                          branding: { ...(prev.branding || {}), logoPosition: value }
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
                        value={settings.branding?.logoSize}
                        onValueChange={(value: any) => setSettings(prev => ({
                          ...prev,
                          branding: { ...(prev.branding || {}), logoSize: value }
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
                    {settings.branding?.productionPhoto ? (
                      <div className="space-y-2">
                        <img 
                          src={settings.branding?.productionPhoto} 
                          alt="Production Photo" 
                          className="max-h-32 mx-auto rounded"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            branding: { ...(prev.branding || {}), productionPhoto: undefined }
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
                                  branding: { ...(prev.branding || {}), productionPhoto: e.target?.result as string }
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
                        checked={settings.branding?.showProductionPhoto}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          branding: { ...(prev.branding || {}), showProductionPhoto: checked }
                        }))}
                      />
                      <Label>Show production photo in reports</Label>
                    </div>
                    
                    {settings.branding?.showProductionPhoto && (
                      <div className="space-y-2">
                        <Label>Photo Position</Label>
                        <Select
                          value={settings.branding?.photoPosition}
                          onValueChange={(value: any) => setSettings(prev => ({
                            ...prev,
                            branding: { ...(prev.branding || {}), photoPosition: value }
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
                <p className="text-sm text-muted-foreground mb-4">
                  Adjust margins for all report templates. Changes apply globally to all templates.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {(['top', 'bottom', 'left', 'right'] as const).map((margin) => {
                    const currentValue = settings.pageMargins?.[margin] || '1in';
                    const numericValue = parseFloat(currentValue.replace(/[^\d.]/g, '')) || 1;
                    const unit = currentValue.replace(/[\d.]/g, '') || 'in';
                    
                    const adjustMargin = (increment: boolean) => {
                      const step = 0.1;
                      const newValue = increment ? numericValue + step : Math.max(0.1, numericValue - step);
                      const newMarginValue = `${newValue.toFixed(1)}${unit}`;
                      
                      setSettings(prev => ({
                        ...prev,
                        pageMargins: { ...(prev.pageMargins || {}), [margin]: newMarginValue }
                      }));
                    };
                    
                    return (
                      <div key={margin} className="space-y-2">
                        <Label className="capitalize">{margin}</Label>
                        <div className="flex items-center space-x-1">
                          <div className="flex flex-col">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-8 p-0 rounded-t-md rounded-b-none border-b-0"
                              onClick={() => adjustMargin(true)}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-8 p-0 rounded-b-md rounded-t-none"
                              onClick={() => adjustMargin(false)}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <Input
                            value={currentValue}
                            onChange={(e) => {
                              let value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value) && value !== '' && !value.includes('in') && !value.includes('cm') && !value.includes('mm') && !value.includes('px')) {
                                value = value + 'in';
                              }
                              setSettings(prev => ({
                                ...prev,
                                pageMargins: { ...(prev.pageMargins || {}), [margin]: value }
                              }));
                            }}
                            className="flex-1 text-center"
                            placeholder="1in"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 <strong>Global Updates:</strong> Margin changes here will update all report templates automatically. 
                    Use the arrows for precise 0.1" increments or type custom values.
                  </p>
                </div>
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
                    <Label htmlFor="heading-size">Size</Label>
                    <Input
                      id="heading-size"
                      name="heading-size"
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
                    <Label htmlFor="heading-line-height">Line Height</Label>
                    <Input
                      id="heading-line-height"
                      name="heading-line-height"
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
                    <Label htmlFor="body-size">Size</Label>
                    <Input
                      id="body-size"
                      name="body-size"
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
                    <Label htmlFor="body-line-height">Line Height</Label>
                    <Input
                      id="body-line-height"
                      name="body-line-height"
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Default Header Template</Label>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Header Content</Label>
                    <div className="relative">
                      <RichTextEditor
                        content={settings.defaultHeader}
                        onChange={(content) => setSettings(prev => ({
                          ...prev,
                          defaultHeader: content
                        }))}
                        placeholder="Enter header content with rich formatting..."
                        className={`min-h-[120px] header-editor-${settings.headerSpacing.replace('.', '-')}`}
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
                      {settings.headerHorizontalLine && (
                        <div className="border-t border-gray-400 mx-4 mt-2" />
                      )}
                      <style>{`
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] h1,
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] h2,
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] h3,
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] h4,
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] h5,
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] h6,
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] p,
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] div {
                          margin-top: 0 !important;
                          margin-bottom: ${(parseFloat(settings.headerSpacing) - 1) * 0.5}em !important;
                          line-height: ${settings.headerSpacing} !important;
                        }
                        .header-editor-${settings.headerSpacing.replace('.', '-')} [contenteditable] > *:last-child {
                          margin-bottom: 0 !important;
                        }
                      `}</style>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use variables: {`{{showName}}, {{reportType}}, {{date}}, {{stageManager}}, {{venue}}`} • Use the page number dropdown and Insert button on the right side of the toolbar
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Line Spacing</Label>
                      <Select
                        value={settings.headerSpacing}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          headerSpacing: value
                        }))}
                      >
                        <SelectTrigger data-testid="select-header-spacing">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.0">Single (1.0)</SelectItem>
                          <SelectItem value="1.15">1.15</SelectItem>
                          <SelectItem value="1.2">1.2</SelectItem>
                          <SelectItem value="1.5">1.5</SelectItem>
                          <SelectItem value="2.0">Double (2.0)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Control spacing between lines in the header
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Horizontal Line</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={settings.headerHorizontalLine}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            headerHorizontalLine: checked
                          }))}
                          data-testid="switch-header-horizontal-line"
                        />
                        <Label className="font-normal text-sm">
                          Show horizontal line below header
                        </Label>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Default Footer Template</Label>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Footer Content</Label>
                    <div className="relative">
                      {settings.footerHorizontalLine && (
                        <div className="border-t border-gray-400 mx-4 mb-2" />
                      )}
                      <RichTextEditor
                        content={settings.defaultFooter}
                        onChange={(content) => setSettings(prev => ({
                          ...prev,
                          defaultFooter: content
                        }))}
                        placeholder="Enter footer content with rich formatting..."
                        className={`min-h-[100px] footer-editor-${settings.footerSpacing.replace('.', '-')}`}
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
                      <style>{`
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] h1,
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] h2,
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] h3,
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] h4,
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] h5,
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] h6,
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] p,
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] div {
                          margin-top: 0 !important;
                          margin-bottom: ${(parseFloat(settings.footerSpacing) - 1) * 0.5}em !important;
                          line-height: ${settings.footerSpacing} !important;
                        }
                        .footer-editor-${settings.footerSpacing.replace('.', '-')} [contenteditable] > *:last-child {
                          margin-bottom: 0 !important;
                        }
                      `}</style>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use variables: {`{{preparedBy}}, {{nextReportDate}}, {{contactInfo}}, {{emergencyContact}}`} • Use the page number dropdown and Insert button on the right side of the toolbar
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Line Spacing</Label>
                      <Select
                        value={settings.footerSpacing}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          footerSpacing: value
                        }))}
                      >
                        <SelectTrigger data-testid="select-footer-spacing">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.0">Single (1.0)</SelectItem>
                          <SelectItem value="1.15">1.15</SelectItem>
                          <SelectItem value="1.2">1.2</SelectItem>
                          <SelectItem value="1.5">1.5</SelectItem>
                          <SelectItem value="2.0">Double (2.0)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Control spacing between lines in the footer
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Horizontal Line</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={settings.footerHorizontalLine}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            footerHorizontalLine: checked
                          }))}
                          data-testid="switch-footer-horizontal-line"
                        />
                        <Label className="font-normal text-sm">
                          Show horizontal line above footer
                        </Label>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                  💡 These settings control how your reports appear when downloaded as PDF. The default values are optimized for professional stage management reports.
                </p>
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
                <Label htmlFor="email-subject">Subject Line Template</Label>
                <Input
                  id="email-subject"
                  name="email-subject"
                  value={settings.email.subjectTemplate}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, subjectTemplate: e.target.value }
                  }))}
                  placeholder="{{showName}} - {{reportType}} - {{date}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-body">Email Body Template</Label>
                <Textarea
                  id="email-body"
                  name="email-body"
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
                <Label htmlFor="email-signature">Email Signature</Label>
                <Textarea
                  id="email-signature"
                  name="email-signature"
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
      </Tabs>
    </div>
  );
});
