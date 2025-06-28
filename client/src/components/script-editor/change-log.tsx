import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Filter, 
  Download, 
  Calendar, 
  User, 
  Type, 
  Plus, 
  Minus, 
  Edit3, 
  Move,
  Clock,
  FileText,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChangeLogProps {
  changes: any[];
  onExport?: () => void;
  showUnpublishedOnly?: boolean;
  className?: string;
  showHeader?: boolean;
}

export function ChangeLog({
  changes,
  onExport,
  showUnpublishedOnly = false,
  className = "",
  showHeader = true
}: ChangeLogProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const changeTypes = [
    { value: "all", label: "All Changes" },
    { value: "insert", label: "Additions", icon: Plus, color: "text-green-600" },
    { value: "delete", label: "Deletions", icon: Minus, color: "text-red-600" },
    { value: "format", label: "Formatting", icon: Edit3, color: "text-blue-600" },
    { value: "move", label: "Moves", icon: Move, color: "text-purple-600" }
  ];

  // Filter changes based on selected criteria
  const filteredChanges = changes.filter(change => {
    if (showUnpublishedOnly && change.isPublished) return false;
    if (filterType !== "all" && change.type !== filterType) return false;
    if (filterUser !== "all" && change.createdBy?.id?.toString() !== filterUser) return false;
    if (searchQuery && !change.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !change.newContent?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group changes by date
  const groupedChanges = filteredChanges.reduce((groups, change) => {
    const date = new Date(change.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(change);
    return groups;
  }, {} as Record<string, any[]>);

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChangeIcon = (type: string) => {
    const changeType = changeTypes.find(ct => ct.value === type);
    return changeType?.icon || Type;
  };

  const getChangeColor = (type: string) => {
    const changeType = changeTypes.find(ct => ct.value === type);
    return changeType?.color || "text-gray-600";
  };

  const getUniqueUsers = () => {
    const users = changes.map(c => c.createdBy).filter(Boolean);
    const uniqueUsers = users.reduce((acc, user) => {
      if (!acc.find(u => u.id === user.id)) acc.push(user);
      return acc;
    }, [] as any[]);
    return uniqueUsers;
  };

  return (
    <div className={`${showHeader ? 'border rounded-lg bg-white dark:bg-gray-900' : ''} ${className}`}>
      {showHeader && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {showUnpublishedOnly ? "Changes Since Last Publish" : "Script Change Log"}
            </h3>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {changeTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {getUniqueUsers().map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search changes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <ScrollArea className="h-[600px]">
        <div className={`${showHeader ? 'p-4' : ''}`}>
          {Object.keys(groupedChanges).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No changes found</p>
              <p className="text-sm">
                {showUnpublishedOnly 
                  ? "All changes have been published" 
                  : "Start editing to see change history"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedChanges)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, dayChanges]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{date}</h4>
                      <Badge variant="outline" className="text-xs">
                        {dayChanges.length} changes
                      </Badge>
                    </div>

                    <div className="space-y-3 ml-6">
                      {dayChanges
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((change, index) => {
                          const Icon = getChangeIcon(change.type);
                          const colorClass = getChangeColor(change.type);
                          
                          return (
                            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className={`flex-shrink-0 ${colorClass}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${colorClass}`}
                                  >
                                    {change.type}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    Position {change.position}
                                    {change.length && ` (${change.length} chars)`}
                                  </span>
                                  {!change.isPublished && (
                                    <Badge variant="secondary" className="text-xs">
                                      Unpublished
                                    </Badge>
                                  )}
                                </div>
                                
                                {change.description && (
                                  <p className="text-sm mb-2">{change.description}</p>
                                )}
                                
                                {/* Show content changes for small changes */}
                                {(change.oldContent || change.newContent) && 
                                 (change.oldContent?.length < 100 || change.newContent?.length < 100) && (
                                  <div className="text-xs space-y-1">
                                    {change.oldContent && (
                                      <div className="bg-red-50 dark:bg-red-950 p-2 rounded border-l-2 border-red-500">
                                        <span className="text-red-600 font-medium">- </span>
                                        <span className="line-through text-red-600">{change.oldContent}</span>
                                      </div>
                                    )}
                                    {change.newContent && (
                                      <div className="bg-green-50 dark:bg-green-950 p-2 rounded border-l-2 border-green-500">
                                        <span className="text-green-600 font-medium">+ </span>
                                        <span className="text-green-600">{change.newContent}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>
                                      {change.createdBy?.firstName} {change.createdBy?.lastName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(change.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {date !== Object.keys(groupedChanges)[Object.keys(groupedChanges).length - 1] && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary stats */}
      {showHeader && (
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {filteredChanges.length} of {changes.length} changes
            </span>
            {showUnpublishedOnly && (
              <Badge variant="outline" className="text-xs">
                {filteredChanges.filter(c => !c.isPublished).length} unpublished
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}