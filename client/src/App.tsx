import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";
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
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  
  // Keep session alive while user is active
  useSessionHeartbeat();

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
        <Route path="/shows/:id/script" component={ScriptEditor} />
        <Route path="/shows/:id/props" component={PropsTracker} />
        <Route path="/shows/:id/costumes" component={CostumeTracker} />
        <Route path="/shows/:id/templates/new" component={TemplateBuilder} />
        <Route path="/shows/:id/templates/:templateId/edit" component={TemplateBuilder} />
        <Route path="/shows/:id/templates" component={TemplateSettings} />
        <Route path="/shows/:id/global-template-settings" component={GlobalTemplateSettings} />
        <Route path="/shows/:id/settings" component={ShowSettings} />
        <Route path="/profile" component={ProfileSettings} />
        <Route path="/admin" component={AdminDashboard} />
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
