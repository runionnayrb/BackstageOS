import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface NavigationContext {
  showId?: string;      // Numeric ID for API calls
  showSlug?: string;    // Slug for navigation URLs
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
  const showSlug = isInShow ? pathParts[1] : undefined;  // URL now contains slug
  const sectionId = isInShow && pathParts[2] ? pathParts[2] : undefined;
  const subsectionId = isInShow && pathParts[3] ? pathParts[3] : undefined;
  const isInSection = isInShow && !!sectionId;

  // Fetch project by slug to get name and numeric ID
  const { data: showData } = useQuery({
    queryKey: ['/api/projects/by-slug', showSlug],
    enabled: !!showSlug,
  });

  const showName = showData?.name as string;
  const showId = showData?.id?.toString();

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
          href: `/shows/${showSlug}`
        });
      }

      // Add section if present
      if (sectionId) {
        const sectionLabel = getSectionLabel(sectionId);
        const isCurrentSection = !subsectionId;
        
        breadcrumbs.push({
          label: sectionLabel,
          href: isCurrentSection ? undefined : `/shows/${showSlug}/${sectionId}`,
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

  // Get smart back destination (uses slug for URLs)
  const getBackDestination = (): string => {
    if (isInShow) {
      if (subsectionId) {
        // From subsection back to section
        return `/shows/${showSlug}/${sectionId}`;
      }
      
      if (sectionId) {
        // From section back to show
        return `/shows/${showSlug}`;
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
    showId,       // Numeric ID for API calls
    showSlug,     // Slug for navigation URLs
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
    'script': 'Script',
    'props': 'Props',
    'contacts': 'Contacts',
    'settings': 'Settings',
    'templates': 'Templates'
  };
  
  return sectionLabels[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
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