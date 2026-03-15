import { Switch, Route, useParams, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";
import { errorLogger } from "@/lib/errorLogger";
import { useSEO } from "@/hooks/useSEO";
import { useEffect } from "react";
import ErrorBoundary from "@/components/error-boundary";
import { AdminViewProvider } from "@/contexts/AdminViewContext";
import { SearchProvider } from "@/components/search/SearchContext";
import { PWAManager } from "@/components/pwa-manager";
import AuthPage from "@/pages/auth-page";
import BetaHome from "@/pages/beta-home";
import ProfileSelection from "@/pages/profile-selection";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ShowOnboarding from "@/pages/show-onboarding";
import Team from "@/pages/team";
import Invitations from "@/pages/invitations";
import ReportBuilder from "@/pages/report-builder";
import Templates from "@/pages/templates";
import ShowDetail from "@/pages/show-detail";
import ShowReports from "@/pages/show-reports";
import ScriptEditor from "@/pages/script-editor";
import PropsTracker from "@/pages/props-tracker";
import PropDetail from "@/pages/prop-detail";
import CostumeTracker from "@/pages/costume-tracker";

import ShowSettings from "@/pages/show-settings";
import ShowReportsList from "@/pages/show-reports-list";
import TemplateSettingsV2 from "@/pages/template-settings-v2";
import TemplateEditorV2 from "@/pages/template-editor-v2";
import GlobalTemplateSettings from "@/pages/global-template-settings";
import ReportViewer from "./pages/report-viewer";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUserRoles from "@/pages/admin-user-roles";
import ProfileSettings from "@/pages/profile-settings";
import Calendar from "@/pages/calendar";
import Schedule from "@/pages/schedule";
import PropsAndCostumes from "@/pages/props-costumes";
import Personnel from "@/pages/personnel";
import PersonnelCategory from "@/pages/personnel-category";
import FeedbackPage from "@/pages/feedback";
import NotFound from "@/pages/not-found";
import WaitlistLanding from "@/pages/waitlist-landing";
import MainLanding from "@/pages/main-landing";
import DNSManager from "@/pages/dns-manager";
import DomainManager from "@/pages/domain-manager";
import PageManager from "@/pages/page-manager";
import AutoResolutionDashboard from "@/pages/auto-resolution-dashboard";
import AdvancedAnalyticsDashboard from "@/pages/advanced-analytics-dashboard";
import SeoManager from "@/pages/seo-manager";
import SEOTest from "@/pages/seo-test";
import TestNotesPage from "@/pages/test-notes";
import NavigationDemo from "@/components/navigation/navigation-demo";
import ContactAvailability from "@/pages/contact-availability";
import EmailManager from "@/pages/email-manager";
import TheaterEmail from "@/pages/theater-email";
import TestImageUpload from "@/pages/test-image-upload";
import Tools from "@/pages/tools";
import Chat from "@/pages/chat";
import PerformanceTracker from "@/pages/PerformanceTracker";
import TaskManagement from "@/pages/TaskManagement";
import Notes from "@/pages/Notes";
import Settings from "@/pages/settings";
import PersonalScheduleViewer from "@/pages/personal-schedule";
import PublicCalendar from "@/pages/public-calendar";
import PublicEventTypeCalendar from "@/pages/public-event-type-calendar";
import DailyCallsList from "@/pages/daily-calls-list";
import DailyCallSheet from "@/pages/daily-calls";
import ArchivedShows from "@/pages/archived-shows";
import Checkout from "@/pages/checkout";
import Pricing from "@/pages/pricing";
import Billing from "@/pages/billing";
import NotesTracking from "@/pages/notes-tracking";
import EmailContacts from "@/pages/email-contacts";
import EmailSetupPage from "@/pages/EmailSetupPage";
import AppleMailSetupPage from "@/pages/AppleMailSetupPage";
import EmailForwardingSetupPage from "@/pages/EmailForwardingSetupPage";
import ScheduleRelationshipMapping from "@/components/schedule-relationship-mapping";
import SecurityPage from "@/pages/security";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import JoinProject from "@/pages/join-project";


function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Initialize SEO for dynamic meta tags based on domain
  useSEO();
  
  // Always call hooks first - never conditionally
  useSessionHeartbeat();
  
  // Initialize error logging - always call
  useEffect(() => {
    // Set current page for error logging
    errorLogger.setCurrentPage(location);
    
    // Track page changes
    const handleRouteChange = () => {
      errorLogger.setCurrentPage(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [location]);

  // Update user ID when authentication changes - always call
  useEffect(() => {
    if (user) {
      errorLogger.setUserId(user.id.toString());
    }
  }, [user]);
  
  // Check domain routing configuration
  const hostname = window.location.hostname;
  const isJoinDomain = hostname.includes('join.backstageos.com') || hostname === 'join.backstageos.com';
  const isMainDomain = hostname === 'backstageos.com' || (hostname.includes('backstageos.com') && !hostname.includes('beta.') && !hostname.includes('join.'));
  const isBetaDomain = hostname.includes('beta.backstageos.com') || hostname === 'beta.backstageos.com';
  const isDevEnvironment = hostname.includes('replit.dev');
  
  // Debug logging for domain routing
  console.log('Domain routing check:', { hostname, isJoinDomain, isMainDomain, isBetaDomain, isDevEnvironment });
  
  // Additional debugging for beta domain
  if (isBetaDomain) {
    console.log('Beta domain detected - proceeding to authentication flow');
  }
  
  // Handle auth-related pages - these must render without Layout
  if (location === '/auth' || location === '/login' || location.startsWith('/auth?')) {
    return <AuthPage />;
  }
  
  // Handle Beta Home page for unauthenticated users
  if (location === '/home') {
    return <BetaHome />;
  }
  
  if (location === '/forgot-password') {
    return <ForgotPassword />;
  }
  
  if (location.startsWith('/reset-password')) {
    return <ResetPassword />;
  }
  
  // Special routes that bypass domain restrictions
  if (location === '/seo-test') {
    return <SEOTest />;
  }


  // Personal schedule viewer route - public access with token
  if (location.startsWith('/personal-schedule/')) {
    const token = location.split('/personal-schedule/')[1];
    return <PersonalScheduleViewer token={token} />;
  }

  // Public calendar viewer route - public access with token
  if (location.startsWith('/public-calendar/event-type/')) {
    return <PublicEventTypeCalendar />;
  }
  
  if (location.startsWith('/public-calendar/')) {
    return <PublicCalendar />;
  }

  // Join project invitation route - PUBLIC route for accepting invitations
  if (location.startsWith('/join/')) {
    return <JoinProject />;
  }

  // Join project invitation route - allows users to accept invitations
  // If this is the join domain, redirect to /landing
  if (isJoinDomain && location !== '/landing') {
    window.location.pathname = '/landing';
    return null;
  }
  
  // DOMAIN-BASED ROUTING FIRST - Check domain before any authentication logic
  // Handle landing page route - no authentication required for any domain
  if (location === '/landing') {
    return <WaitlistLanding />;
  }

  // Handle main landing page
  if (location === '/main-landing') {
    return <MainLanding />;
  }

  // Main domain (backstageos.com) - ALWAYS show waitlist, never require authentication
  // This includes both root path and /landing path for backstageos.com
  if (isMainDomain) {
    return <WaitlistLanding />;
  }
  
  // Policy pages - public access, render immediately without waiting for auth
  if (location === '/security') {
    return <SecurityPage />;
  }
  if (location === '/privacy') {
    return <PrivacyPage />;
  }
  if (location === '/terms') {
    return <TermsPage />;
  }
  
  // Pricing page - public access for unauthenticated users
  if (location === '/pricing' && !user && !isLoading) {
    return <Pricing />;
  }
  
  // For dev environment, show Beta Home page if not authenticated (except for explicit public routes)
  // This guard now comes AFTER the auth page early returns above
  if (isDevEnvironment && !user && !isLoading) {
    return <BetaHome />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Beta domain or other subdomains - show Beta Home for unauthenticated users
  if (!user && (isBetaDomain || (!isMainDomain && !isJoinDomain && !isDevEnvironment))) {
    return <BetaHome />;
  }

  // If authenticated but no feature preferences selected (new onboarding flow)
  // Allow users with legacy profileType to skip this step
  if (user && !(user as any)?.defaultFeaturePreferences && !(user as any)?.profileType) {
    return <ProfileSelection />;
  }

  // Check if user needs payment (past_due, canceled, incomplete)
  if (user && (user as any).needsPayment && location !== '/pricing' && location !== '/checkout' && location !== '/onboarding') {
    window.location.href = '/pricing';
    return null;
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Switch>
        <Route path="/" component={Projects} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/archived" component={ArchivedShows} />
        <Route path="/create-project" component={ShowOnboarding} />
        <Route path="/onboarding" component={ShowOnboarding} />
        <Route path="/shows/:id" component={ShowDetail} />
        <Route path="/shows/:id/reports" component={ShowReportsList} />
        <Route path="/shows/:id/reports/:type/builder" component={ReportBuilder} />
        <Route path="/shows/:id/reports/:type/:reportId/edit" component={ReportBuilder} />
        <Route path="/shows/:id/reports/:type/:reportId" component={ReportViewer} />
        <Route path="/shows/:id/reports/:type" component={ShowReports} />
        <Route path="/shows/:id/calendar" component={Calendar} />
        <Route path="/shows/:id/calendar/schedule" component={Schedule} />
        <Route path="/shows/:id/calls" component={DailyCallsList} />
        <Route path="/shows/:id/calls/:date" component={DailyCallSheet} />
        <Route path="/shows/:id/script" component={ScriptEditor} />
        <Route path="/shows/:id/props-costumes" component={PropsAndCostumes} />
        <Route path="/shows/:id/props" component={PropsTracker} />
        <Route path="/shows/:id/props/:propId" component={PropDetail} />
        <Route path="/shows/:id/costumes" component={CostumeTracker} />
        <Route path="/shows/:id/contacts" component={Personnel} />
        <Route path="/shows/:id/contacts/:category" component={PersonnelCategory} />
        <Route path="/shows/:id/contacts/:contactId/availability" component={ContactAvailability} />
        <Route path="/shows/:id/performance-tracker" component={PerformanceTracker} />
        <Route path="/shows/:id/tasks" component={TaskManagement} />
        <Route path="/tasks" component={TaskManagement} />
        <Route path="/shows/:id/notes" component={Notes} />
        <Route path="/shows/:id/notes-tracking" component={NotesTracking} />
        <Route path="/shows/:id/email-contacts" component={EmailContacts} />
        <Route path="/shows/:id/schedule-mapping" component={() => {
          const params = useParams<{ id: string }>();
          return <ScheduleRelationshipMapping projectId={parseInt(params.id || '1')} />;
        }} />
        <Route path="/notes" component={Notes} />
        <Route path="/templates" component={Templates} />
        <Route path="/shows/:id/templates-v2/:templateId/edit" component={TemplateEditorV2} />
        <Route path="/shows/:id/templates-v2" component={TemplateSettingsV2} />
        <Route path="/shows/:id/global-template-settings" component={GlobalTemplateSettings} />
        <Route path="/shows/:id/settings" component={ShowSettings} />
        <Route path="/settings" component={Settings} />
        <Route path="/profile" component={ProfileSettings} />
        <Route path="/feedback" component={FeedbackPage} />

        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/user-roles" component={AdminUserRoles} />
        <Route path="/admin/pages" component={PageManager} />
        <Route path="/admin/dns" component={DNSManager} />
        <Route path="/admin/domains" component={DomainManager} />
        <Route path="/admin/seo" component={SeoManager} />
        <Route path="/email" component={EmailManager} />
        <Route path="/email-manager" component={EmailManager} />
        <Route path="/email-contacts" component={EmailContacts} />
        <Route path="/email-setup" component={EmailSetupPage} />
        <Route path="/email-setup/apple-mail" component={AppleMailSetupPage} />
        <Route path="/email-setup/forwarding" component={EmailForwardingSetupPage} />
        <Route path="/tools" component={Tools} />
        <Route path="/chat" component={Chat} />
        <Route path="/shows/:showId/theater-email" component={TheaterEmail} />
        <Route path="/auto-resolution-dashboard" component={AutoResolutionDashboard} />
        <Route path="/advanced-analytics-dashboard" component={AdvancedAnalyticsDashboard} />
        <Route path="/test-notes" component={TestNotesPage} />
        <Route path="/test-image-upload" component={TestImageUpload} />
        <Route path="/navigation-demo" component={NavigationDemo} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/billing" component={Billing} />
        <Route component={NotFound} />
        </Switch>
      </Layout>
    </ErrorBoundary>
  );
}

function App() {
  // Check for public pages BEFORE mounting AuthProvider
  // This prevents the 20-30 second auth delay on full page refreshes
  // and ensures these pages render without any Layout wrapper
  const currentPath = window.location.pathname;
  
  // Handles domain check
  const hostname = window.location.hostname;
  const isJoinDomain = hostname.includes('join.backstageos.com') || hostname === 'join.backstageos.com';
  const isMainDomain = hostname === 'backstageos.com' || (hostname.includes('backstageos.com') && !hostname.includes('beta.') && !hostname.includes('join.'));
  const isBetaDomain = hostname.includes('beta.backstageos.com') || hostname === 'beta.backstageos.com';
  const isDevEnvironment = hostname.includes('replit.dev');

  // Special routes that bypass domain restrictions and Layout
  if (currentPath.startsWith('/personal-schedule/')) {
    const token = currentPath.split('/personal-schedule/')[1];
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <PersonalScheduleViewer token={token} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (currentPath.startsWith('/public-calendar/')) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          {currentPath.startsWith('/public-calendar/event-type/') ? <PublicEventTypeCalendar /> : <PublicCalendar />}
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Join project invitation route
  if (currentPath.startsWith('/join/')) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <JoinProject />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  // Beta Home page for marketing
  if (currentPath === '/home') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BetaHome />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // Auth pages - must render without Layout
  if (currentPath === '/auth' || currentPath === '/login') {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AuthPage />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }
  if (currentPath === '/forgot-password') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ForgotPassword />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  if (currentPath.startsWith('/reset-password')) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ResetPassword />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // Pricing page - fast render for unauthenticated users
  if (currentPath === '/pricing') {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminViewProvider>
            <TooltipProvider>
              <Toaster />
              <Pricing />
            </TooltipProvider>
          </AdminViewProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }
  
  // Policy pages
  if (currentPath === '/security') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <SecurityPage />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  if (currentPath === '/privacy') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <PrivacyPage />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  if (currentPath === '/terms') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <TermsPage />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminViewProvider>
          <SearchProvider>
            <TooltipProvider>
              <PWAManager>
                <Toaster />
                <Router />
              </PWAManager>
            </TooltipProvider>
          </SearchProvider>
        </AdminViewProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
