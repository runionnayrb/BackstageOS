import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";
import { errorLogger } from "@/lib/errorLogger";
import { useEffect } from "react";
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
import CostumeTracker from "@/pages/costume-tracker";
import TemplateCustomizer from "@/pages/template-customizer";
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
import DNSManager from "@/pages/dns-manager";
import DomainManager from "@/pages/domain-manager";
import PageManager from "@/pages/page-manager";


function Router() {
  const { user, isLoading } = useAuth();
  
  // Check if this is the main landing page domain FIRST
  const hostname = window.location.hostname;
  const isJoinDomain = hostname.includes('join.backstageos.com') || hostname === 'join.backstageos.com';
  const isMainDomain = hostname === 'backstageos.com' || hostname.includes('backstageos.com');
  
  // Debug logging for domain routing
  console.log('Domain routing check:', { hostname, isJoinDomain, isMainDomain });
  
  // If this is the join domain, redirect to /landing
  if (isJoinDomain && window.location.pathname !== '/landing') {
    window.location.pathname = '/landing';
    return null;
  }
  
  // If this is the main backstageos.com domain and user is not authenticated, show landing page
  if (isMainDomain && !isLoading && !user && window.location.pathname === '/') {
    window.location.pathname = '/landing';
    return null;
  }
  const isAuthenticated = !!user;
  
  // Keep session alive while user is active
  useSessionHeartbeat();

  // Initialize error logging
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

  // Update user ID when authentication changes
  useEffect(() => {
    if (user) {
      errorLogger.setUserId(user.id.toString());
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!user?.profileType) {
    return <ProfileSelection />;
  }

  // Handle landing page route separately (no layout needed)
  if (window.location.pathname === '/landing') {
    return <WaitlistLanding />;
  }

  return (
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
        <Route path="/shows/:id/costumes" component={CostumeTracker} />
        <Route path="/shows/:id/contacts" component={Personnel} />
        <Route path="/shows/:id/contact-sheet" component={ContactSheet} />
        <Route path="/shows/:id/company-list" component={CompanyList} />
        <Route path="/shows/:id/contacts/:category" component={PersonnelCategory} />
        <Route path="/shows/:id/templates/new" component={TemplateBuilder} />
        <Route path="/shows/:id/templates/:templateId/edit" component={TemplateBuilder} />
        <Route path="/shows/:id/templates" component={TemplateSettings} />
        <Route path="/shows/:id/global-template-settings" component={GlobalTemplateSettings} />
        <Route path="/shows/:id/settings" component={ShowSettings} />
        <Route path="/profile" component={ProfileSettings} />
        <Route path="/feedback" component={FeedbackPage} />

        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/pages" component={PageManager} />
        <Route path="/admin/dns" component={DNSManager} />
        <Route path="/admin/domains" component={DomainManager} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
