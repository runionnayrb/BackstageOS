import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Clock, 
  User, 
  Plus, 
  Minus, 
  Edit3, 
  FileText
} from "lucide-react";

interface ChangeLogProps {
  changes: any[];
  onExport?: () => void;
  className?: string;
  showHeader?: boolean;
}

export function ChangeLog({
  changes,
  onExport,
  className = "",
  showHeader = true
}: ChangeLogProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'insert': return Plus;
      case 'delete': return Minus;
      case 'format': return Edit3;
      default: return Edit3;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'insert': return 'text-green-600';
      case 'delete': return 'text-red-600';
      case 'format': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`${showHeader ? 'border rounded-lg bg-white dark:bg-gray-900' : ''} ${className}`}>
      {showHeader && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Script Change Log</h3>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="h-[500px]">
        <div className={`${showHeader ? 'p-4' : ''} space-y-4`}>
          {changes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No changes found</p>
              <p className="text-sm">Start editing to see change history</p>
            </div>
          ) : (
            changes.map((change, index) => {
              const ChangeIcon = getChangeIcon(change.type);
              return (
                <div key={change.id || index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ChangeIcon className={`h-4 w-4 ${getChangeColor(change.type)}`} />
                      <Badge variant="outline" className={`text-xs ${getChangeColor(change.type)}`}>
                        {change.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(change.timestamp || change.createdAt)}
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <p className="font-medium">{change.description}</p>
                    {change.content && (
                      <p className="text-sm text-muted-foreground mt-1">
                        "{change.content}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{change.author}</span>
                    {change.position && (
                      <span>• Position {change.position}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}