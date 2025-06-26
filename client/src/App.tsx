import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
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
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (!user?.profileType) {
    return <ProfileSelection />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/create-project" component={CreateProject} />
        <Route path="/team" component={Team} />
        <Route path="/invitations" component={Invitations} />
        <Route path="/reports" component={Reports} />
        <Route path="/report-builder" component={ReportBuilder} />
        <Route path="/templates" component={Templates} />
        <Route path="/template-builder" component={TemplateBuilder} />
        <Route path="/shows/:id" component={ShowDetail} />
        <Route path="/shows/:id/reports/:type" component={ShowReports} />
        <Route path="/shows/:id/script" component={ScriptEditor} />
        <Route path="/shows/:id/props" component={PropsTracker} />
        <Route path="/shows/:id/costumes" component={CostumeTracker} />
        <Route path="/shows/:id/templates/new" component={TemplateCustomizer} />
        <Route path="/shows/:id/templates/:templateId/edit" component={TemplateCustomizer} />
        <Route path="/shows/:id/settings" component={ShowSettings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
