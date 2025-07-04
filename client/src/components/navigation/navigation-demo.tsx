import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BreadcrumbNavigation from "./breadcrumb-navigation";
import QuickSectionSwitcher from "./quick-section-switcher";
import RecentShowsSwitcher from "./recent-shows-switcher";
import ContextAwareBackButton from "./context-aware-back-button";
import { useNavigation } from "@/hooks/useNavigation";

export default function NavigationDemo() {
  const navigation = useNavigation();

  const mockBreadcrumbs = [
    { label: 'Shows', href: '/' },
    { label: 'Hamlet', href: '/shows/1' },
    { label: 'Reports', href: '/shows/1/reports' },
    { label: 'Tech Report', isCurrentPage: true }
  ];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Navigation System</h1>
        <p className="text-gray-600">
          Here's how the enhanced header navigation components work together to provide 
          context-aware navigation throughout the theater management platform.
        </p>
      </div>

      {/* Breadcrumb Navigation Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Breadcrumb Navigation
            <Badge variant="outline">Always Visible</Badge>
          </CardTitle>
          <CardDescription>
            Shows hierarchical location and allows easy navigation back to any parent level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <BreadcrumbNavigation items={mockBreadcrumbs} />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Key Features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Home icon links to show list</li>
              <li>Each level is clickable (except current page)</li>
              <li>Current page highlighted with background</li>
              <li>Responsive design with proper spacing</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Section Switcher Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Quick Section Switcher
            <Badge variant="outline">Show Context</Badge>
          </CardTitle>
          <CardDescription>
            Fast switching between sections within a show (Reports, Calendar, Script, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg flex items-center">
            <QuickSectionSwitcher 
              currentShowId="1"
              currentShowName="Hamlet"
              currentSection="reports"
            />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Key Features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Shows current section with icon</li>
              <li>Dropdown reveals all available sections</li>
              <li>Active section highlighted</li>
              <li>Icons provide visual context</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recent Shows Switcher Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Recent & Pinned Shows
            <Badge variant="outline">Global Access</Badge>
          </CardTitle>
          <CardDescription>
            Quick access to recently viewed shows and ability to pin frequently used productions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg flex items-center">
            <RecentShowsSwitcher currentShowId="1" />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Key Features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Automatically tracks recent shows</li>
              <li>Pin/unpin shows for permanent access</li>
              <li>Shows production status badges</li>
              <li>Venue information when available</li>
              <li>Star icons for pinning/unpinning</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Context-Aware Back Button Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Smart Back Button
            <Badge variant="outline">Context Aware</Badge>
          </CardTitle>
          <CardDescription>
            Intelligent back navigation that understands the current location and provides logical navigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <ContextAwareBackButton 
              showName="Hamlet"
              customText="Back to Reports"
            />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Smart Logic Examples:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>From Tech Report → "Back to Reports"</li>
              <li>From Reports Section → "Back to Hamlet" (show name)</li>
              <li>From Script Editor → "Back to Hamlet"</li>
              <li>From Show Detail → "Back to Shows"</li>
              <li>Fallback → "Back" (with logical destination)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Current Navigation State */}
      <Card>
        <CardHeader>
          <CardTitle>Current Navigation State</CardTitle>
          <CardDescription>
            Live data from the useNavigation hook showing current location context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div>Location: {typeof window !== 'undefined' ? window.location.pathname : '/demo'}</div>
            <div>Show ID: {navigation.showId || 'none'}</div>
            <div>Show Name: {navigation.showName || 'none'}</div>
            <div>Section: {navigation.sectionId || 'none'}</div>
            <div>In Show: {navigation.isInShow.toString()}</div>
            <div>In Section: {navigation.isInSection.toString()}</div>
            <div>Back Destination: {navigation.backDestination}</div>
            <div>Back Text: "{navigation.backText}"</div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Why This Approach Works for Theater Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Theater Workflow Benefits</h4>
              <ul className="text-sm space-y-1">
                <li>• Stage managers work intensively on single tasks</li>
                <li>• Quick switching between shows during busy periods</li>
                <li>• Context always visible without distraction</li>
                <li>• Mobile-friendly for backstage use</li>
                <li>• Reduced cognitive load during technical rehearsals</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">Technical Benefits</h4>
              <ul className="text-sm space-y-1">
                <li>• Clean header without visual clutter</li>
                <li>• Context-aware navigation reduces clicks</li>
                <li>• Smart breadcrumbs provide orientation</li>
                <li>• Recent shows cached in localStorage</li>
                <li>• Responsive design works on all devices</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}