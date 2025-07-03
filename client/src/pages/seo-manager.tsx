import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Globe, Search, Bot, Image, Settings, Plus, Edit, Trash2, Eye, Copy, Upload, X } from "lucide-react";
import { Link } from "wouter";
import { insertSeoSettingsSchema, type SeoSettings, type InsertSeoSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import AdminGuard from "@/components/admin-guard";

const formSchema = insertSeoSettingsSchema.omit({ 
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true
});

type FormData = z.infer<typeof formSchema>;

const defaultStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BackstageOS",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "category": "SaaS"
  },
  "targetAudience": {
    "@type": "Audience",
    "audienceType": "Theater Professionals"
  }
};

function SeoManagerContent() {
  const [selectedSettings, setSelectedSettings] = useState<SeoSettings | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingShareImage, setUploadingShareImage] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: seoSettings = [], isLoading } = useQuery<SeoSettings[]>({
    queryKey: ['/api/seo-settings'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain: "",
      siteTitle: "",
      siteDescription: "",
      keywords: "",
      faviconUrl: "",
      appleTouchIconUrl: "",
      shareImageUrl: "",
      shareImageAlt: "",
      twitterCard: "summary_large_image",
      twitterHandle: "",
      author: "",
      themeColor: "#2563eb",
      customMeta: {},
      openGraphType: "website",
      structuredData: defaultStructuredData,
      aiDescription: "",
      semanticKeywords: "",
      contentCategories: "",
      targetAudience: "Theater Professionals, Stage Managers",
      industryVertical: "Theater & Entertainment",
      functionalityTags: "Theater Management, Production Tools, Stage Management",
      aiMetadata: {},
      robotsDirectives: "index, follow",
      canonicalUrl: "",
      languageCode: "en-US",
      geoTargeting: "",
      isActive: true
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('POST', '/api/seo-settings', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo-settings'] });
      toast({ title: "SEO settings created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create SEO settings",
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FormData> }) => {
      const res = await apiRequest('PUT', `/api/seo-settings/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo-settings'] });
      toast({ title: "SEO settings updated successfully" });
      setIsDialogOpen(false);
      setSelectedSettings(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update SEO settings",
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/seo-settings/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo-settings'] });
      toast({ title: "SEO settings deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete SEO settings",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: FormData) => {
    if (selectedSettings) {
      updateMutation.mutate({ id: selectedSettings.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Image upload handlers
  const handleImageUpload = async (file: File, type: 'favicon' | 'shareImage') => {
    if (type === 'favicon') setUploadingFavicon(true);
    if (type === 'shareImage') setUploadingShareImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Update form with uploaded image URL
      if (type === 'favicon') {
        form.setValue('faviconUrl', result.url);
        if (result.appleTouchIconUrl) {
          form.setValue('appleTouchIconUrl', result.appleTouchIconUrl);
        }
      } else if (type === 'shareImage') {
        form.setValue('shareImageUrl', result.url);
      }

      toast({ title: `${type === 'favicon' ? 'Favicon' : 'Share image'} uploaded successfully` });
    } catch (error) {
      toast({ 
        title: "Upload failed", 
        description: "Failed to upload image. Please try again.",
        variant: "destructive" 
      });
    } finally {
      if (type === 'favicon') setUploadingFavicon(false);
      if (type === 'shareImage') setUploadingShareImage(false);
    }
  };

  const handleImageRemove = (type: 'favicon' | 'shareImage') => {
    if (type === 'favicon') {
      form.setValue('faviconUrl', '');
      form.setValue('appleTouchIconUrl', '');
    } else if (type === 'shareImage') {
      form.setValue('shareImageUrl', '');
      form.setValue('shareImageAlt', '');
    }
    toast({ title: `${type === 'favicon' ? 'Favicon' : 'Share image'} removed` });
  };

  const handleEdit = (settings: SeoSettings) => {
    setSelectedSettings(settings);
    form.reset({
      domain: settings.domain,
      siteTitle: settings.siteTitle,
      siteDescription: settings.siteDescription,
      keywords: settings.keywords || "",
      faviconUrl: settings.faviconUrl || "",
      appleTouchIconUrl: settings.appleTouchIconUrl || "",
      shareImageUrl: settings.shareImageUrl || "",
      shareImageAlt: settings.shareImageAlt || "",
      twitterCard: settings.twitterCard || "summary_large_image",
      twitterHandle: settings.twitterHandle || "",
      author: settings.author || "",
      themeColor: settings.themeColor || "#2563eb",
      customMeta: settings.customMeta || {},
      openGraphType: settings.openGraphType || "website",
      structuredData: settings.structuredData || defaultStructuredData,
      aiDescription: settings.aiDescription || "",
      semanticKeywords: settings.semanticKeywords || "",
      contentCategories: settings.contentCategories || "",
      targetAudience: settings.targetAudience || "Theater Professionals, Stage Managers",
      industryVertical: settings.industryVertical || "Theater & Entertainment",
      functionalityTags: settings.functionalityTags || "Theater Management, Production Tools, Stage Management",
      aiMetadata: settings.aiMetadata || {},
      robotsDirectives: settings.robotsDirectives || "index, follow",
      canonicalUrl: settings.canonicalUrl || "",
      languageCode: settings.languageCode || "en-US",
      geoTargeting: settings.geoTargeting || "",
      isActive: settings.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete these SEO settings?")) {
      deleteMutation.mutate(id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const testConnectivity = async () => {
    try {
      // Test external API connectivity to verify internet connection
      const response = await fetch('https://httpbin.org/json');
      const data = await response.json();
      toast({ 
        title: "Internet Connectivity Test Successful", 
        description: `Connected to external API successfully. Server origin: ${data.origin}`
      });
      return true;
    } catch (error) {
      toast({ 
        title: "Connectivity Test Failed", 
        description: "Cannot connect to external services",
        variant: "destructive" 
      });
      return false;
    }
  };

  const generateMetaTags = (settings: SeoSettings) => {
    return `<!-- Basic Meta Tags -->
<title>${settings.siteTitle}</title>
<meta name="description" content="${settings.siteDescription}" />
<meta name="keywords" content="${settings.keywords || ''}" />
<meta name="author" content="${settings.author || ''}" />
<meta name="robots" content="${settings.robotsDirectives}" />
<meta name="language" content="${settings.languageCode}" />
${settings.canonicalUrl ? `<link rel="canonical" href="${settings.canonicalUrl}" />` : ''}

<!-- Open Graph Tags -->
<meta property="og:title" content="${settings.siteTitle}" />
<meta property="og:description" content="${settings.siteDescription}" />
<meta property="og:type" content="${settings.openGraphType}" />
${settings.shareImageUrl ? `<meta property="og:image" content="${settings.shareImageUrl}" />` : ''}
${settings.shareImageAlt ? `<meta property="og:image:alt" content="${settings.shareImageAlt}" />` : ''}

<!-- Twitter Card Tags -->
<meta name="twitter:card" content="${settings.twitterCard}" />
${settings.twitterHandle ? `<meta name="twitter:site" content="${settings.twitterHandle}" />` : ''}
<meta name="twitter:title" content="${settings.siteTitle}" />
<meta name="twitter:description" content="${settings.siteDescription}" />
${settings.shareImageUrl ? `<meta name="twitter:image" content="${settings.shareImageUrl}" />` : ''}

<!-- Favicon and Icons -->
${settings.faviconUrl ? `<link rel="icon" href="${settings.faviconUrl}" />` : ''}
${settings.appleTouchIconUrl ? `<link rel="apple-touch-icon" href="${settings.appleTouchIconUrl}" />` : ''}

<!-- Theme and Mobile -->
<meta name="theme-color" content="${settings.themeColor}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />

<!-- AI Optimization -->
<meta name="ai-description" content="${settings.aiDescription || settings.siteDescription}" />
<meta name="semantic-keywords" content="${settings.semanticKeywords || ''}" />
<meta name="content-categories" content="${settings.contentCategories || ''}" />
<meta name="target-audience" content="${settings.targetAudience || ''}" />
<meta name="industry-vertical" content="${settings.industryVertical || ''}" />

<!-- Structured Data -->
<script type="application/ld+json">
${JSON.stringify(settings.structuredData, null, 2)}
</script>`;
  };

  if (isLoading) {
    return <div className="p-8">Loading SEO settings...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 py-3 sm:py-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">SEO & AI Optimization</h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Manage search engine and AI optimization settings for all domains</p>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                variant="outline"
                onClick={testConnectivity}
                className="w-full sm:w-auto"
              >
                <Globe className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Test </span>Connectivity
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                className="w-full sm:w-auto"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button
                variant={viewMode === 'preview' ? 'default' : 'outline'}
                onClick={() => setViewMode('preview')}
                className="w-full sm:w-auto"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setSelectedSettings(null);
                    form.reset();
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedSettings ? 'Edit SEO Settings' : 'Create SEO Settings'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure search engine and AI optimization for your domain
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Basic Settings */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <Globe className="mr-2 h-5 w-5" />
                          Basic Settings
                        </h3>
                        
                        <FormField
                          control={form.control}
                          name="domain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Domain</FormLabel>
                              <FormControl>
                                <Input placeholder="example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="siteTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Site Title</FormLabel>
                              <FormControl>
                                <Input placeholder="BackstageOS - Theater Management Platform" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="siteDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Site Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Revolutionary theater management platform for professional stage managers..."
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Favicon Management */}
                        <div className="space-y-3">
                          <FormLabel>Favicon</FormLabel>
                          {form.watch('faviconUrl') ? (
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <img 
                                  src={form.watch('faviconUrl')} 
                                  alt="Favicon preview" 
                                  className="h-8 w-8 rounded border"
                                />
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {form.watch('faviconUrl')}
                                </p>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <label htmlFor="faviconUpload">
                                  <Button type="button" variant="outline" size="sm" asChild disabled={uploadingFavicon}>
                                    <span className="cursor-pointer">
                                      {uploadingFavicon ? 'Uploading...' : 'Replace'}
                                    </span>
                                  </Button>
                                </label>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleImageRemove('favicon')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600 mb-2">Upload favicon</p>
                              <label htmlFor="faviconUpload">
                                <Button type="button" variant="outline" size="sm" asChild disabled={uploadingFavicon}>
                                  <span className="cursor-pointer">
                                    {uploadingFavicon ? 'Uploading...' : 'Choose File'}
                                  </span>
                                </Button>
                              </label>
                              <p className="text-xs text-gray-500 mt-2">Recommended: 32x32px or 16x16px, ICO or PNG</p>
                            </div>
                          )}
                          <input
                            id="faviconUpload"
                            type="file"
                            accept="image/*,.ico"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, 'favicon');
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="faviconUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Favicon URL (or upload above)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com/favicon.ico" {...field} />
                                </FormControl>
                                <FormDescription>You can either upload an image above or enter a URL manually</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* SEO Optimization */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <Search className="mr-2 h-5 w-5" />
                          SEO Optimization
                        </h3>
                        
                        <FormField
                          control={form.control}
                          name="keywords"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Keywords</FormLabel>
                              <FormControl>
                                <Input placeholder="theater management, stage management, production tools..." {...field} />
                              </FormControl>
                              <FormDescription>Comma-separated keywords</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="robotsDirectives"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Robots Directives</FormLabel>
                              <FormControl>
                                <Input placeholder="index, follow" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="canonicalUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Canonical URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://backstageos.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* AI Optimization */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <Bot className="mr-2 h-5 w-5" />
                          AI Optimization
                        </h3>
                        
                        <FormField
                          control={form.control}
                          name="aiDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>AI-Optimized Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Detailed description optimized for AI systems and search engines..."
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>Enhanced description for AI understanding</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="semanticKeywords"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Semantic Keywords</FormLabel>
                              <FormControl>
                                <Input placeholder="show management, rehearsal coordination, production planning..." {...field} />
                              </FormControl>
                              <FormDescription>LSI and semantic keywords for AI understanding</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="targetAudience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Audience</FormLabel>
                              <FormControl>
                                <Input placeholder="Theater Professionals, Stage Managers" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="industryVertical"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry Vertical</FormLabel>
                              <FormControl>
                                <Input placeholder="Theater & Entertainment" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="functionalityTags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Functionality Tags</FormLabel>
                              <FormControl>
                                <Input placeholder="Theater Management, Production Tools, Stage Management" {...field} />
                              </FormControl>
                              <FormDescription>What the application does (comma-separated)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Social Media & Images */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <Image className="mr-2 h-5 w-5" />
                          Social Media & Images
                        </h3>
                        
                        {/* Share Image Management */}
                        <div className="space-y-3">
                          <FormLabel>Share Image</FormLabel>
                          {form.watch('shareImageUrl') ? (
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <img 
                                  src={form.watch('shareImageUrl')} 
                                  alt="Share preview" 
                                  className="h-20 w-auto rounded border"
                                />
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {form.watch('shareImageUrl')}
                                </p>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <label htmlFor="shareImageUpload">
                                  <Button type="button" variant="outline" size="sm" asChild disabled={uploadingShareImage}>
                                    <span className="cursor-pointer">
                                      {uploadingShareImage ? 'Uploading...' : 'Replace'}
                                    </span>
                                  </Button>
                                </label>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleImageRemove('shareImage')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600 mb-2">Upload share image (Open Graph)</p>
                              <label htmlFor="shareImageUpload">
                                <Button type="button" variant="outline" size="sm" asChild disabled={uploadingShareImage}>
                                  <span className="cursor-pointer">
                                    {uploadingShareImage ? 'Uploading...' : 'Choose File'}
                                  </span>
                                </Button>
                              </label>
                              <p className="text-xs text-gray-500 mt-2">Recommended: 1200x630px, PNG or JPG</p>
                            </div>
                          )}
                          <input
                            id="shareImageUpload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, 'shareImage');
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="shareImageUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Share Image URL (or upload above)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com/og-image.jpg" {...field} />
                                </FormControl>
                                <FormDescription>You can either upload an image above or enter a URL manually</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="shareImageAlt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Share Image Alt Text</FormLabel>
                              <FormControl>
                                <Input placeholder="BackstageOS theater management platform interface" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="twitterHandle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twitter Handle</FormLabel>
                              <FormControl>
                                <Input placeholder="@backstageos" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          {createMutation.isPending || updateMutation.isPending 
                            ? "Saving..." 
                            : selectedSettings ? "Update" : "Create"
                          }
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {viewMode === 'list' ? (
          <div className="grid gap-6">
            {seoSettings.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No SEO Settings</CardTitle>
                  <CardDescription>
                    Create your first SEO configuration to optimize your domains for search engines and AI systems.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              seoSettings.map((settings: SeoSettings) => (
                <Card key={settings.id}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="space-y-2 flex-1">
                        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                          <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="break-words">{settings.domain}</span>
                          {settings.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{settings.siteTitle}</CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(generateMetaTags(settings))}
                          className="w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <Copy className="h-4 w-4 sm:mr-0" />
                          <span className="ml-2 sm:hidden">Copy</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(settings)}
                          className="w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <Edit className="h-4 w-4 sm:mr-0" />
                          <span className="ml-2 sm:hidden">Edit</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(settings.id)}
                          className="w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <Trash2 className="h-4 w-4 sm:mr-0" />
                          <span className="ml-2 sm:hidden">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {settings.siteDescription}
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">SEO Features</h4>
                          <div className="space-y-1 text-sm">
                            {settings.keywords && (
                              <div className="flex items-center space-x-2">
                                <Search className="h-3 w-3" />
                                <span>Keywords: {settings.keywords.split(',').length}</span>
                              </div>
                            )}
                            {settings.shareImageUrl && (
                              <div className="flex items-center space-x-2">
                                <Image className="h-3 w-3" />
                                <span>Share Image</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <Globe className="h-3 w-3" />
                              <span>Language: {settings.languageCode}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">AI Optimization</h4>
                          <div className="space-y-1 text-sm">
                            {settings.aiDescription && (
                              <div className="flex items-center space-x-2">
                                <Bot className="h-3 w-3" />
                                <span>AI Description</span>
                              </div>
                            )}
                            {settings.semanticKeywords && (
                              <div className="flex items-center space-x-2">
                                <Bot className="h-3 w-3" />
                                <span>Semantic Keywords</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <Bot className="h-3 w-3" />
                              <span>Industry: {settings.industryVertical}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {seoSettings.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No SEO Settings to Preview</CardTitle>
                  <CardDescription>
                    Create SEO settings to see generated meta tags and structured data.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              seoSettings.map((settings: SeoSettings) => (
                <Card key={settings.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{settings.domain} - Meta Tags Preview</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(generateMetaTags(settings))}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy HTML
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{generateMetaTags(settings)}</code>
                    </pre>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeoManager() {
  return (
    <AdminGuard>
      <SeoManagerContent />
    </AdminGuard>
  );
}