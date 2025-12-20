import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface NavigationContext {
  showId?: string;
  showName?: string;
  sectionId?: string;
  subsectionId?: string;
  pageTitle?: string;
  isInShow: boolean;
  isInSection: boolean;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

export function useNavigation(): NavigationContext & {
  breadcrumbs: BreadcrumbItem[];
  backDestination: string;
  backText: string;
} {
  const [location] = useLocation();
  
  // Parse location to extract navigation context
  const pathParts = location.split('/').filter(Boolean);
  
  const isInShow = pathParts[0] === 'shows' && !!pathParts[1];
  const showId = isInShow ? pathParts[1] : undefined;
  const sectionId = isInShow && pathParts[2] ? pathParts[2] : undefined;
  const subsectionId = isInShow && pathParts[3] ? pathParts[3] : undefined;
  const isInSection = isInShow && !!sectionId;

  // Get show data if we're in a show
  const { data: showData } = useQuery({
    queryKey: [`/api/projects/${showId}`],
    enabled: !!showId,
  });

  const showName = showData?.name as string;

  // Generate breadcrumbs
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];

    if (isInShow) {
      // Always start with Shows
      breadcrumbs.push({
        label: 'Shows',
        href: '/'
      });

      // Add show name if we have it
      if (showName) {
        breadcrumbs.push({
          label: showName,
          href: `/shows/${showId}`
        });
      }

      // Add section if present
      if (sectionId) {
        const sectionLabel = getSectionLabel(sectionId);
        const sectionPath = getSectionPath(sectionId);
        const isCurrentSection = !subsectionId;
        
        breadcrumbs.push({
          label: sectionLabel,
          href: isCurrentSection ? undefined : `/shows/${showId}/${sectionPath}`,
          isCurrentPage: isCurrentSection
        });
      }

      // Add subsection if present
      if (subsectionId) {
        const subsectionLabel = getSubsectionLabel(subsectionId, sectionId);
        breadcrumbs.push({
          label: subsectionLabel,
          isCurrentPage: true
        });
      }
    }

    return breadcrumbs;
  };

  // Get smart back destination
  const getBackDestination = (): string => {
    if (isInShow) {
      if (subsectionId) {
        // From subsection back to section (use corrected path for calls -> calendar)
        const sectionPath = getSectionPath(sectionId || '');
        return `/shows/${showId}/${sectionPath}`;
      }
      
      if (sectionId) {
        // From section back to show
        return `/shows/${showId}`;
      }
      
      // From show back to shows list
      return '/';
    }
    
    return '/';
  };

  // Get smart back text
  const getBackText = (): string => {
    if (isInShow) {
      if (subsectionId) {
        const sectionLabel = getSectionLabel(sectionId);
        return `Back to ${sectionLabel}`;
      }
      
      if (sectionId) {
        return showName ? `Back to ${showName}` : 'Back to Show';
      }
      
      return 'Back to Shows';
    }
    
    return 'Back';
  };

  const breadcrumbs = generateBreadcrumbs();
  const backDestination = getBackDestination();
  const backText = getBackText();

  return {
    showId,
    showName,
    sectionId,
    subsectionId,
    isInShow,
    isInSection,
    breadcrumbs,
    backDestination,
    backText,
  };
}

// Helper function to get section display labels
function getSectionLabel(sectionId: string): string {
  const sectionLabels: Record<string, string> = {
    'reports': 'Reports',
    'calendar': 'Calendar',
    'calls': 'Calendar',
    'script': 'Script',
    'props': 'Props',
    'contacts': 'Contacts',
    'settings': 'Settings',
    'templates': 'Templates'
  };
  
  return sectionLabels[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
}

// Helper to get the actual navigation path for a section
function getSectionPath(sectionId: string): string {
  const sectionPaths: Record<string, string> = {
    'calls': 'calendar',
  };
  return sectionPaths[sectionId] || sectionId;
}

// Helper function to get subsection display labels  
function getSubsectionLabel(subsectionId: string, sectionId?: string): string {
  if (!sectionId) return subsectionId.charAt(0).toUpperCase() + subsectionId.slice(1);
  // Context-aware subsection labels
  if (sectionId === 'reports') {
    const reportLabels: Record<string, string> = {
      'rehearsal': 'Rehearsal Report',
      'tech': 'Tech Report',
      'performance': 'Performance Report',
      'meeting': 'Meeting Report'
    };
    return reportLabels[subsectionId] || subsectionId;
  }
  
  if (sectionId === 'contacts') {
    const contactLabels: Record<string, string> = {
      'cast': 'Cast',
      'crew': 'Crew',
      'creative': 'Creative Team',
      'production': 'Production Team',
      'venue': 'Venue Staff'
    };
    return contactLabels[subsectionId] || subsectionId;
  }
  
  // Default formatting
  return subsectionId.charAt(0).toUpperCase() + subsectionId.slice(1);
}