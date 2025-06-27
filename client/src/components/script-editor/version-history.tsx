import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  User, 
  GitBranch, 
  Download, 
  Eye, 
  RotateCcw,
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface VersionHistoryProps {
  versions: any[];
  currentVersion: string;
  onRevert: (versionId: string) => void;
  onPreview: (versionId: string) => void;
  onPublish: (versionId: string) => void;
  className?: string;
}

export function VersionHistory({
  versions,
  currentVersion,
  onRevert,
  onPreview,
  onPublish,
  className = ""
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getChangesSummary = (changes: any[]) => {
    if (!changes || changes.length === 0) return "No changes recorded";
    
    const additionsCount = changes.filter(c => c.type === 'insert').length;
    const deletionsCount = changes.filter(c => c.type === 'delete').length;
    const modificationsCount = changes.filter(c => c.type === 'format' || c.type === 'move').length;
    
    const parts = [];
    if (additionsCount > 0) parts.push(`+${additionsCount} additions`);
    if (deletionsCount > 0) parts.push(`-${deletionsCount} deletions`);
    if (modificationsCount > 0) parts.push(`${modificationsCount} modifications`);
    
    return parts.join(', ') || "Minor changes";
  };

  return (
    <div className={`border rounded-lg bg-white dark:bg-gray-900 ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Version History</h3>
          <Badge variant="outline" className="text-xs">
            Current: v{currentVersion}
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="p-4 space-y-4">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                selectedVersion === version.id 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedVersion(version.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">v{version.version}</span>
                  {version.version === currentVersion && (
                    <Badge variant="default" className="text-xs">Current</Badge>
                  )}
                  {version.isPublished && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Published
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(version.publishedAt || version.createdAt)}
                </div>
              </div>

              <div className="mb-3">
                <h4 className="font-medium mb-1">{version.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {getChangesSummary(version.changes)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{version.publishedBy?.firstName} {version.publishedBy?.lastName}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(version.id);
                    }}
                    className="h-7 px-2"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  
                  {version.version !== currentVersion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRevert(version.id);
                      }}
                      className="h-7 px-2"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Revert
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Download version as PDF
                    }}
                    className="h-7 px-2"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Detailed changes when selected */}
              {selectedVersion === version.id && version.changes && version.changes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="text-sm font-medium mb-2">Changes in this version:</h5>
                  <div className="space-y-2">
                    {version.changes.slice(0, 5).map((change: any, changeIndex: number) => (
                      <div key={changeIndex} className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              change.type === 'insert' ? 'text-green-600' :
                              change.type === 'delete' ? 'text-red-600' :
                              'text-blue-600'
                            }`}
                          >
                            {change.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            Position {change.position}
                          </span>
                        </div>
                        {change.description && (
                          <p className="text-muted-foreground">{change.description}</p>
                        )}
                      </div>
                    ))}
                    {version.changes.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{version.changes.length - 5} more changes...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {versions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No version history available</p>
              <p className="text-sm">Save your script to create the first version</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}