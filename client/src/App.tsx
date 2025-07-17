import { Switch, Route } from "wouter";
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
import AuthPage from "@/pages/auth-page";
import ProfileSelection from "@/pages/profile-selection";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import CreateProject from "@/pages/create-project";
import Team from "@/pages/team";
import Invitations from "@/pages/invitations";
import Reports from "@/pages/reports";
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
import GlobalTemplateSettings from "@/pages/global-template-settings";
import NewReport from "@/pages/new-report";
import ReportViewer from "./pages/report-viewer";
import AdminDashboard from "@/pages/admin-dashboard";
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


function Router() {
  const { user, isLoading } = useAuth();
  
  // Initialize SEO for dynamic meta tags based on domain
  useSEO();
  
  // Always call hooks first - never conditionally
  useSessionHeartbeat();
  
  // Initialize error logging - always call
  useEffect(() => {
    // Set current page for error logging
    errorLogger.setCurrentPage(window.location.pathname);
    
    // Track page changes
    const handleRouteChange = () => {
      errorLogger.setCurrentPage(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

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
  if (window.location.pathname === '/seo-test') {
    return <SEOTest />;
  }
  

  
  // If this is the join domain, redirect to /landing
  if (isJoinDomain && window.location.pathname !== '/landing') {
    window.location.pathname = '/landing';
    return null;
  }
  
  // DOMAIN-BASED ROUTING FIRST - Check domain before any authentication logic
  // Handle landing page route - no authentication required for any domain
  if (window.location.pathname === '/landing') {
    return <WaitlistLanding />;
  }

  // Main domain (backstageos.com) - ALWAYS show waitlist, never require authentication
  // This includes both root path and /landing path for backstageos.com
  if (isMainDomain) {
    return <WaitlistLanding />;
  }
  
  // For dev environment, show authentication page if not authenticated (except for explicit waitlist routes)
  if (isDevEnvironment && !user && !isLoading && window.location.pathname !== '/landing') {
    return <AuthPage />;
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

  return (
    <ErrorBoundary>
      <Layout>
        <Switch>
        <Route path="/" component={Projects} />
        <Route path="/create-project" component={CreateProject} />
        <Route path="/shows/:id" component={ShowDetail} />
        <Route path="/shows/:id/reports" component={ShowReportsList} />
        <Route path="/shows/:id/reports/:type/new" component={NewReport} />
        <Route path="/shows/:id/reports/:type/:reportId/edit" component={ReportBuilder} />
        <Route path="/shows/:id/reports/:type/:reportId" component={ReportViewer} />
        <Route path="/shows/:id/reports/:type" component={ShowReports} />
        <Route path="/shows/:id/calendar" component={Calendar} />
        <Route path="/shows/:id/calendar/schedule" component={Schedule} />
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
        <Route path="/shows/:id/templates/new" component={TemplateBuilder} />
        <Route path="/shows/:id/templates/:templateId/edit" component={TemplateBuilder} />
        <Route path="/shows/:id/templates" component={TemplateSettings} />
        <Route path="/shows/:id/global-template-settings" component={GlobalTemplateSettings} />
        <Route path="/shows/:id/settings" component={ShowSettings} />
        <Route path="/profile" component={ProfileSettings} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/login" component={AuthPage} />

        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/pages" component={PageManager} />
        <Route path="/admin/dns" component={DNSManager} />
        <Route path="/admin/domains" component={DomainManager} />
        <Route path="/admin/seo" component={SeoManager} />
        <Route path="/email" component={EmailManager} />
        <Route path="/email-manager" component={EmailManager} />
        <Route path="/tools" component={Tools} />
        <Route path="/chat" component={Chat} />
        <Route path="/shows/:showId/theater-email" component={TheaterEmail} />
        <Route path="/auto-resolution-dashboard" component={AutoResolutionDashboard} />
        <Route path="/advanced-analytics-dashboard" component={AdvancedAnalyticsDashboard} />
        <Route path="/test-notes" component={TestNotesPage} />
        <Route path="/test-image-upload" component={TestImageUpload} />
        <Route path="/navigation-demo" component={NavigationDemo} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
