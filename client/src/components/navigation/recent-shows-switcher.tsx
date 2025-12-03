import { useState, useEffect } from "react";
import { Clock, Star, StarOff, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Show {
  id: number;
  slug: string;
  name: string;
  venue?: string;
  status: string;
  isPinned?: boolean;
  lastAccessed?: string;
}

interface RecentShowsSwitcherProps {
  currentShowSlug?: string;
  className?: string;
}

export default function RecentShowsSwitcher({ currentShowSlug, className = "" }: RecentShowsSwitcherProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch all shows
  const { data: shows = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Get recent/pinned shows from localStorage (now stores slugs)
  const [recentShows, setRecentShows] = useState<string[]>([]);
  const [pinnedShows, setPinnedShows] = useState<string[]>([]);

  // Migrate old ID-based storage to slug-based on component mount
  useEffect(() => {
    if ((shows as Show[]).length === 0) return;
    
    const storedRecent = JSON.parse(localStorage.getItem('recentShows') || '[]');
    const storedPinned = JSON.parse(localStorage.getItem('pinnedShows') || '[]');
    
    // Helper to resolve a stored value to a slug
    // Handles: legacy IDs -> slug, numeric slugs (like "1984"), and regular slugs
    const resolveToSlug = (value: string): string | null => {
      // First check if this matches an existing slug directly
      const matchBySlug = (shows as Show[]).find(s => s.slug === value);
      if (matchBySlug) return value;
      
      // If numeric, check if it's a legacy ID that needs migration
      if (!isNaN(Number(value))) {
        const matchById = (shows as Show[]).find(s => s.id.toString() === value);
        if (matchById) return matchById.slug;
      }
      
      // Value doesn't match any current show (may have been deleted)
      return null;
    };
    
    // Resolve all stored values
    const resolvedRecent = storedRecent.map(resolveToSlug).filter(Boolean) as string[];
    const resolvedPinned = storedPinned.map(resolveToSlug).filter(Boolean) as string[];
    
    // Update localStorage if any migrations occurred
    const recentChanged = JSON.stringify(resolvedRecent) !== JSON.stringify(storedRecent);
    const pinnedChanged = JSON.stringify(resolvedPinned) !== JSON.stringify(storedPinned);
    
    if (recentChanged) {
      localStorage.setItem('recentShows', JSON.stringify(resolvedRecent));
    }
    if (pinnedChanged) {
      localStorage.setItem('pinnedShows', JSON.stringify(resolvedPinned));
    }
    
    setRecentShows(resolvedRecent);
    setPinnedShows(resolvedPinned);
  }, [shows]);

  // Update recent shows when currentShowSlug changes
  useEffect(() => {
    if (currentShowSlug && !recentShows.includes(currentShowSlug)) {
      const updated = [currentShowSlug, ...recentShows.slice(0, 4)]; // Keep last 5
      setRecentShows(updated);
      localStorage.setItem('recentShows', JSON.stringify(updated));
    }
  }, [currentShowSlug, recentShows]);

  const togglePin = (showSlug: string) => {
    const updated = pinnedShows.includes(showSlug)
      ? pinnedShows.filter(slug => slug !== showSlug)
      : [...pinnedShows, showSlug];
    
    setPinnedShows(updated);
    localStorage.setItem('pinnedShows', JSON.stringify(updated));
  };

  const currentShow = (shows as Show[]).find((show: Show) => show.slug === currentShowSlug);
  const pinnedShowsData = (shows as Show[]).filter((show: Show) => pinnedShows.includes(show.slug));
  const recentShowsData = (shows as Show[]).filter((show: Show) => 
    recentShows.includes(show.slug) && !pinnedShows.includes(show.slug)
  ).slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'rehearsals': return 'bg-orange-100 text-orange-800';
      case 'tech': return 'bg-red-100 text-red-800';
      case 'performance': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`flex items-center gap-2 text-gray-700 hover:text-gray-900 ${className}`}>
          <Clock className="h-4 w-4" />
          <span className="font-medium hidden sm:inline">
            {currentShow?.name || 'Switch Show'}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {pinnedShowsData.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Pinned Shows
            </div>
            {pinnedShowsData.map((show: Show) => (
              <DropdownMenuItem 
                key={show.id}
                onClick={() => setLocation(`/shows/${show.slug}`)}
                className="flex items-center justify-between cursor-pointer p-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{show.name}</span>
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(show.status)}`}>
                      {show.status}
                    </Badge>
                  </div>
                  {show.venue && (
                    <span className="text-xs text-gray-500">{show.venue}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(show.slug);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {recentShowsData.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Recent Shows
            </div>
            {recentShowsData.map((show: Show) => (
              <DropdownMenuItem 
                key={show.id}
                onClick={() => setLocation(`/shows/${show.slug}`)}
                className="flex items-center justify-between cursor-pointer p-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{show.name}</span>
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(show.status)}`}>
                      {show.status}
                    </Badge>
                  </div>
                  {show.venue && (
                    <span className="text-xs text-gray-500">{show.venue}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(show.slug);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <StarOff className="h-3 w-3 text-gray-400" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem 
          onClick={() => setLocation('/')}
          className="cursor-pointer text-blue-600 hover:text-blue-800"
        >
          View All Shows
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}