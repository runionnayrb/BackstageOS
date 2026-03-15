import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SeoSettings {
  id: number;
  domain: string;
  siteTitle: string;
  siteDescription: string;
  keywords?: string;
  faviconUrl?: string;
  appleTouchIconUrl?: string;
  shareImageUrl?: string;
  shareImageAlt?: string;
  twitterCard?: string;
  twitterHandle?: string;
  author?: string;
  themeColor?: string;
  openGraphType?: string;
  structuredData?: any;
  aiDescription?: string;
  semanticKeywords?: string;
  contentCategories?: string;
  targetAudience?: string;
  industryVertical?: string;
  functionalityTags?: string;
  aiMetadata?: any;
  robotsDirectives?: string;
  canonicalUrl?: string;
  languageCode?: string;
  geoTargeting?: string;
  isActive?: boolean;
}

// Helper function to get current domain
const getCurrentDomain = (): string => {
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;
  
  // For development, use a default domain or the hostname
  if (hostname.includes('replit.dev') || hostname.includes('localhost')) {
    return 'backstageos.com'; // Default domain for development
  }
  
  return hostname;
};

// Helper function to safely update or create meta tags
const updateMetaTag = (property: string, content: string, isProperty = false) => {
  if (!content) return;
  
  const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
  let metaTag = document.querySelector(selector);
  
  if (!metaTag) {
    metaTag = document.createElement('meta');
    if (isProperty) {
      metaTag.setAttribute('property', property);
    } else {
      metaTag.setAttribute('name', property);
    }
    document.head.appendChild(metaTag);
  }
  
  metaTag.setAttribute('content', content);
};

// Helper function to update link tags
const updateLinkTag = (rel: string, href: string) => {
  if (!href) return;
  
  let linkTag = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!linkTag) {
    linkTag = document.createElement('link');
    linkTag.rel = rel;
    document.head.appendChild(linkTag);
  }
  
  linkTag.href = href;
};

// Helper function to inject structured data
const updateStructuredData = (structuredData: any) => {
  if (!structuredData) return;
  
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
};

export const useSEO = () => {
  const currentDomain = getCurrentDomain();
  
  const { data: seoSettings, isLoading } = useQuery<SeoSettings>({
    queryKey: ['/api/seo-settings', currentDomain],
    queryFn: async () => {
      const response = await fetch(`/api/seo-settings/${currentDomain}`);
      if (!response.ok) {
        if (response.status === 404) {
          // No SEO settings for this domain, that's ok
          return null;
        }
        throw new Error('Failed to fetch SEO settings');
      }
      return response.json();
    },
    retry: false, // Don't retry if domain doesn't have SEO settings
    staleTime: 30 * 60 * 1000, // 30 minutes - SEO settings rarely change
    gcTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  useEffect(() => {
    if (!seoSettings || !seoSettings.isActive) return;

    console.log('Applying SEO settings:', seoSettings);

    // Update basic meta tags
    document.title = seoSettings.siteTitle;
    updateMetaTag('description', seoSettings.siteDescription || 'Professional stage management software for theater productions');
    updateMetaTag('keywords', seoSettings.keywords || 'theater management, stage management, production tools, backstage software');
    updateMetaTag('author', seoSettings.author || 'BackstageOS');
    updateMetaTag('robots', seoSettings.robotsDirectives || 'index, follow');
    updateMetaTag('language', seoSettings.languageCode || 'en-US');
    
    // Update Open Graph tags
    updateMetaTag('og:title', seoSettings.siteTitle, true);
    updateMetaTag('og:description', seoSettings.siteDescription || 'Professional stage management software for theater productions', true);
    updateMetaTag('og:type', seoSettings.openGraphType || 'website', true);
    updateMetaTag('og:url', window.location.href, true);
    updateMetaTag('og:site_name', 'BackstageOS', true);
    
    if (seoSettings.shareImageUrl) {
      // Ensure the image URL is absolute
      const imageUrl = seoSettings.shareImageUrl.startsWith('http') 
        ? seoSettings.shareImageUrl 
        : `${window.location.origin}${seoSettings.shareImageUrl}`;
      
      updateMetaTag('og:image', imageUrl, true);
      updateMetaTag('og:image:alt', seoSettings.shareImageAlt || seoSettings.siteTitle, true);
      updateMetaTag('og:image:type', 'image/png', true);
      
      // Add image dimensions for better sharing (recommended for Open Graph)
      updateMetaTag('og:image:width', '1200', true);
      
      console.log('Applied share image URL:', imageUrl);
      updateMetaTag('og:image:height', '630', true);
      
      console.log('Applied share image URL:', imageUrl);
    }
    
    // Update Twitter Card tags
    updateMetaTag('twitter:card', seoSettings.twitterCard || 'summary_large_image');
    updateMetaTag('twitter:title', seoSettings.siteTitle);
    updateMetaTag('twitter:description', seoSettings.siteDescription || 'Professional stage management software for theater productions');
    
    if (seoSettings.twitterHandle) {
      updateMetaTag('twitter:site', seoSettings.twitterHandle);
    }
    
    if (seoSettings.shareImageUrl) {
      // Ensure the Twitter image URL is absolute
      const twitterImageUrl = seoSettings.shareImageUrl.startsWith('http') 
        ? seoSettings.shareImageUrl 
        : `${window.location.origin}${seoSettings.shareImageUrl}`;
      
      updateMetaTag('twitter:image', twitterImageUrl);
      updateMetaTag('twitter:image:alt', seoSettings.shareImageAlt || seoSettings.siteTitle);
      
      console.log('Applied Twitter image URL:', twitterImageUrl);
    }
    
    // Update favicons
    if (seoSettings.faviconUrl) {
      updateLinkTag('icon', seoSettings.faviconUrl);
    }
    
    if (seoSettings.appleTouchIconUrl) {
      updateLinkTag('apple-touch-icon', seoSettings.appleTouchIconUrl);
    }
    
    // Update canonical URL
    if (seoSettings.canonicalUrl) {
      updateLinkTag('canonical', seoSettings.canonicalUrl);
    }
    
    // Update theme color
    if (seoSettings.themeColor) {
      updateMetaTag('theme-color', seoSettings.themeColor);
    }
    
    // Update AI optimization meta tags with fallbacks
    updateMetaTag('ai-description', seoSettings.aiDescription || seoSettings.siteDescription || 'Professional stage management software for theater productions');
    updateMetaTag('semantic-keywords', seoSettings.semanticKeywords || 'theater management, stage management, production tools, backstage software, rehearsal management');
    updateMetaTag('content-categories', seoSettings.contentCategories || 'Theater Software, Production Management, Stage Management');
    updateMetaTag('target-audience', seoSettings.targetAudience || 'Theater Professionals, Stage Managers');
    updateMetaTag('industry-vertical', seoSettings.industryVertical || 'Theater & Entertainment');
    updateMetaTag('functionality-tags', seoSettings.functionalityTags || 'Theater Management, Production Tools, Stage Management');
    
    // Additional AI optimization meta tags for better indexing
    updateMetaTag('application-name', 'BackstageOS');
    updateMetaTag('category', 'Business Application');
    updateMetaTag('classification', 'SaaS, Theater Management Software');
    updateMetaTag('creator', 'BackstageOS');
    updateMetaTag('subject', 'Stage Management and Theater Production Software');
    
    console.log('Applied AI optimization meta tags');
    
    // Update structured data
    if (seoSettings.structuredData) {
      updateStructuredData(seoSettings.structuredData);
    }
    
  }, [seoSettings]);

  return {
    seoSettings,
    isLoading,
    isConfigured: !!seoSettings
  };
};