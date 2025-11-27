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
import ProfileSelection from "@/pages/profile-selection";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import CreateProject from "@/pages/create-project";
import Team from "@/pages/team";
import Invitations from "@/pages/invitations";
import ReportBuilder from "@/pages/report-builder";
import Templates from "@/pages/templates";
import TemplateBuilder from "@/pages/template-builder";
import ShowDetail from "@/pages/show-detail";
import ShowReports from "@/pages/show-reports";
import ScriptEditor from "@/pages/script-editor";
import PropsTracker from "@/pages/props-tracker";
import PropDetail from "@/pages/prop-detail";
import CostumeTracker from "@/pages/costume-tracker";

import ShowSettings from "@/pages/show-settings";
import ShowReportsList from "@/pages/show-reports-list";
import TemplateSettings from "@/pages/template-settings";
import TemplateSettingsV2 from "@/pages/template-settings-v2";
import TemplateEditorV2 from "@/pages/template-editor-v2";
import GlobalTemplateSettings from "@/pages/global-template-settings";
import NewReport from "@/pages/new-report";
import ReportViewer from "./pages/report-viewer";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUserRoles from "@/pages/admin-user-roles";
import ProfileSettings from "@/pages/profile-settings";
import Calendar from "@/pages/calendar";
import Schedule from "@/pages/schedule";
import PropsAndCostumes from "@/pages/props-costumes";
import Personnel from "@/pages/personnel";
import PersonnelCategory from "@/pages/personnel-category";
import ContactSheet from "@/pages/contact-sheet";
import CompanyList from "@/pages/company-list";
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
import Subscribe from "@/pages/subscribe";
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
  
  // For dev environment, show authentication page if not authenticated (except for explicit public routes)
  const publicRoutes = ['/landing', '/security', '/privacy', '/terms', '/main-landing', '/forgot-password', '/reset-password', '/auth', '/login'];
  const isPublicRoute = publicRoutes.includes(location);
  if (isDevEnvironment && !user && !isLoading && !isPublicRoute) {
    return <AuthPage />;
  }
  
  // Handle password reset pages - no authentication required
  if (location === '/forgot-password') {
    return <ForgotPassword />;
  }
  
  if (location === '/reset-password') {
    return <ResetPassword />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Beta domain or other subdomains - require authentication (but not for dev environment with authenticated users)
  if (!user && (isBetaDomain || (!isMainDomain && !isJoinDomain && !isDevEnvironment))) {
    return <AuthPage />;
  }

  // If authenticated but no profile type selected
  if (user && !user?.profileType) {
    return <ProfileSelection />;
  }

  // Check if user needs payment (past_due, canceled, incomplete)
  if (user && (user as any).needsPayment && location !== '/subscribe' && location !== '/checkout') {
    window.location.href = '/subscribe';
    return null;
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Switch>
        <Route path="/" component={Projects} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/archived" component={ArchivedShows} />
        <Route path="/create-project" component={CreateProject} />
        <Route path="/shows/:id" component={ShowDetail} />
        <Route path="/shows/:id/reports" component={ShowReportsList} />
        <Route path="/shows/:id/reports/:type/new" component={NewReport} />
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
        <Route path="/shows/:id/contact-sheet" component={ContactSheet} />
        <Route path="/shows/:id/company-list" component={CompanyList} />
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
        <Route path="/shows/:id/templates/new" component={TemplateBuilder} />
        <Route path="/shows/:id/templates/:templateId/edit" component={TemplateBuilder} />
        <Route path="/shows/:id/templates" component={TemplateSettings} />
        <Route path="/shows/:id/templates-v2/:templateId/edit" component={TemplateEditorV2} />
        <Route path="/shows/:id/templates-v2" component={TemplateSettingsV2} />
        <Route path="/shows/:id/global-template-settings" component={GlobalTemplateSettings} />
        <Route path="/shows/:id/settings" component={ShowSettings} />
        <Route path="/settings" component={Settings} />
        <Route path="/profile" component={ProfileSettings} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/login" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

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
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/billing" component={Billing} />
        <Route path="/security" component={SecurityPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route component={NotFound} />
        </Switch>
      </Layout>
    </ErrorBoundary>
  );
}

function App() {
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
