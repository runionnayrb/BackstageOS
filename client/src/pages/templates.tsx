import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { 
  Plus, 
  Edit3, 
  Copy, 
  Trash2, 
  FileText, 
  Users, 
  Star,
  Settings
} from "lucide-react";

export default function Templates() {
  const [, setLocation] = useLocation();

  const { data: templateData, isLoading } = useQuery({
    queryKey: ["/api/templates"],
  });

  const userTemplates = templateData?.userTemplates || [];
  const publicTemplates = templateData?.publicTemplates || [];
  const defaultTemplates = templateData?.defaultTemplates || [];

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case "rehearsal": return <FileText className="w-5 h-5 text-blue-600" />;
      case "tech": return <Settings className="w-5 h-5 text-green-600" />;
      case "performance": return <Star className="w-5 h-5 text-purple-600" />;
      case "meeting": return <Users className="w-5 h-5 text-orange-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTemplateBg = (type: string) => {
    switch (type) {
      case "rehearsal": return "bg-blue-100";
      case "tech": return "bg-green-100";
      case "performance": return "bg-purple-100";
      case "meeting": return "bg-orange-100";
      default: return "bg-gray-100";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const TemplateCard = ({ template, showActions = true }: { template: any, showActions?: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2 ${getTemplateBg(template.type)} rounded-lg`}>
            {getTemplateIcon(template.type)}
          </div>
          <div className="flex space-x-1">
            {template.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
            {template.isPublic && (
              <Badge variant="outline">Public</Badge>
            )}
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {template.description || "No description provided"}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>
            {Array.isArray(template.fields) ? template.fields.length : 0} fields
          </span>
          <span>Created {formatDate(template.createdAt)}</span>
        </div>
        
        {showActions && (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/report-builder?template=${template.id}`)}
            >
              Use Template
            </Button>
            {!template.isDefault && (
              <>
                <Button variant="ghost" size="sm">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Templates</h2>
          <p className="text-gray-600">Manage and customize your report templates</p>
        </div>
        <Button onClick={() => setLocation("/template-builder")}>
          <Plus className="w-5 h-5 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="my-templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-templates">My Templates ({userTemplates.length})</TabsTrigger>
          <TabsTrigger value="default">Default Templates ({defaultTemplates.length})</TabsTrigger>
          <TabsTrigger value="public">Public Templates ({publicTemplates.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-templates" className="space-y-6">
          {userTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No custom templates yet</h3>
              <p className="text-gray-500 mb-6">Create your first custom template to streamline report creation</p>
              <Button onClick={() => setLocation("/template-builder")}>
                <Plus className="w-5 h-5 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTemplates.map((template: any) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="default" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultTemplates.map((template: any) => (
              <TemplateCard key={template.id} template={template} showActions={false} />
            ))}
          </div>
          
          {defaultTemplates.length === 0 && (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No default templates</h3>
              <p className="text-gray-500">Default templates will appear here when available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="public" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicTemplates.map((template: any) => (
              <TemplateCard key={template.id} template={template} showActions={false} />
            ))}
          </div>
          
          {publicTemplates.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No public templates</h3>
              <p className="text-gray-500">Public templates shared by other users will appear here</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}