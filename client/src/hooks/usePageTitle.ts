import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function usePageTitle(dynamicTitle?: string) {
  const [location] = useLocation();
  
  // Get show data if we're in a show context
  const pathParts = location.split('/');
  const showId = pathParts[1] === 'shows' && pathParts[2] ? pathParts[2] : null;
  
  const { data: showData } = useQuery({
    queryKey: [`/api/projects/${showId}`],
    enabled: !!showId,
    select: (data: any) => data || {},
  });

  const getPageTitle = (): string => {
    // If dynamic title is provided, use it
    if (dynamicTitle) {
      return dynamicTitle;
    }
    
    const pathParts = location.split('/');
    
    // Root dashboard
    if (location === '/') {
      return 'Shows';
    }
    
    // Show-specific pages
    if (pathParts[1] === 'shows' && pathParts[2]) {
      const showName = showData?.name;
      
      if (pathParts[3]) {
        // Show sub-pages
        switch (pathParts[3]) {
          case 'reports':
            return 'Reports';
          case 'calendar':
            return 'Calendar';
          case 'script':
            return 'Script';
          case 'props':
            return 'Props';
          case 'contacts':
            return 'Contacts';
          case 'settings':
            return 'Show Settings';
          case 'performance-tracker':
            return 'Performance Tracker';
          case 'schedule-mapping':
            return 'Schedule Mapping';
          case 'tasks':
            return 'Show Tasks';
          case 'notes':
            return 'Show Notes';
          case 'notes-tracking':
            return 'Report Notes';
          default:
            return showName || 'Show';
        }
      }
      
      // Show detail page - show name only
      return showName || 'Show';
    }
    
    // Top-level pages
    switch (pathParts[1]) {
      case 'email':
        return 'Email';
      case 'tasks':
        return 'Tasks';
      case 'notes':
        return 'Notes';
      case 'chat':
        return 'Chat';
      case 'create-project':
        return 'New Show';
      case 'profile':
        return 'Profile';
      case 'billing':
        return 'Billing';
      case 'feedback':
        return 'Feedback';
      case 'admin':
        if (pathParts[2] === 'seo') return 'SEO Manager';
        if (pathParts[2] === 'dns') return 'DNS Manager';
        return 'Admin';
      default:
        return 'BackstageOS';
    }
  };

  return {
    pageTitle: getPageTitle(),
    showId,
    showName: showData?.name
  };
}