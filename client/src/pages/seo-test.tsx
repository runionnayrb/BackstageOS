import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function SEOTest() {
  const { seoSettings, isLoading, isConfigured } = useSEO();
  const { toast } = useToast();
  const [metaTags, setMetaTags] = useState<Array<{tag: string, content: string}>>([]);

  useEffect(() => {
    // Extract meta tags from the current page
    const extractedTags: Array<{tag: string, content: string}> = [];
    
    // Get all meta tags
    const metaElements = document.querySelectorAll('meta');
    metaElements.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content && (
        name.startsWith('og:') || 
        name.startsWith('twitter:') || 
        ['description', 'keywords', 'author', 'robots', 'theme-color'].includes(name) ||
        name.includes('ai-') || 
        name.includes('semantic') ||
        name.includes('target-audience') ||
        name.includes('industry')
      )) {
        extractedTags.push({ tag: name, content });
      }
    });

    // Get title
    extractedTags.unshift({ tag: 'title', content: document.title });

    // Get structured data
    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    if (structuredDataScript) {
      extractedTags.push({ tag: 'structured-data', content: structuredDataScript.textContent || '' });
    }

    setMetaTags(extractedTags);
  }, [seoSettings]);

  const copyMetaTags = () => {
    const metaTagsText = metaTags
      .filter(tag => tag.tag !== 'structured-data')
      .map(tag => `<meta ${tag.tag.startsWith('og:') ? 'property' : 'name'}="${tag.tag}" content="${tag.content}" />`)
      .join('\n');
    
    navigator.clipboard.writeText(metaTagsText);
    toast({ title: "Meta tags copied to clipboard" });
  };

  const testSocialSharing = () => {
    const url = window.location.href;
    const encodedUrl = encodeURIComponent(url);
    
    // Open Facebook debugger
    window.open(`https://developers.facebook.com/tools/debug/?q=${encodedUrl}`, '_blank');
  };

  const testTwitterCard = () => {
    const url = window.location.href;
    const encodedUrl = encodeURIComponent(url);
    
    // Open Twitter card validator
    window.open(`https://cards-dev.twitter.com/validator?url=${encodedUrl}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">Loading SEO test...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">SEO & Social Sharing Test</h1>
        <p className="text-gray-600">Verify that your SEO settings and meta tags are working correctly</p>
      </div>

      {/* SEO Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>SEO Configuration Status</span>
            {isConfigured ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Current domain: {window.location.hostname}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {seoSettings && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Basic Info</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Title:</strong> {seoSettings.siteTitle}</p>
                  <p><strong>Description:</strong> {seoSettings.siteDescription || 'Using fallback description'}</p>
                  <p><strong>Domain:</strong> {seoSettings.domain}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Social Sharing</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Share Image:</strong> {seoSettings.shareImageUrl ? '✅ Configured' : '❌ Not set'}</p>
                  <p><strong>Twitter Card:</strong> {seoSettings.twitterCard}</p>
                  <p><strong>Open Graph Type:</strong> {seoSettings.openGraphType}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Tags Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Applied Meta Tags ({metaTags.length})</span>
            <Button onClick={copyMetaTags} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
          </CardTitle>
          <CardDescription>
            These meta tags are currently active in the page head
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="space-y-2 text-sm font-mono">
              {metaTags.map((tag, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{tag.tag}:</span>
                      <div className="text-gray-700 dark:text-gray-300 break-words mt-1">
                        {tag.tag === 'structured-data' ? (
                          <pre className="text-xs whitespace-pre-wrap">{tag.content}</pre>
                        ) : (
                          tag.content
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Sharing Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Social Sharing Tests</CardTitle>
          <CardDescription>
            Test how your URL appears when shared on social platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={testSocialSharing} className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4" />
              <span>Test Facebook Sharing</span>
            </Button>
            <Button onClick={testTwitterCard} variant="outline" className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4" />
              <span>Test Twitter Cards</span>
            </Button>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Testing Tips:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Use the Facebook Debugger to see how your page appears when shared</li>
              <li>• Twitter Card Validator shows your Twitter card preview</li>
              <li>• Your share image URL: <code className="bg-white dark:bg-gray-800 px-1 rounded">{seoSettings?.shareImageUrl ? `${window.location.origin}${seoSettings.shareImageUrl}` : 'Not set'}</code></li>
              <li>• Current page URL: <code className="bg-white dark:bg-gray-800 px-1 rounded">{window.location.href}</code></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}