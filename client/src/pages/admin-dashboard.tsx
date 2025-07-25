import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Settings, MessageSquare, AlertTriangle, ClipboardList, CreditCard, UserCheck } from "lucide-react";
import { Link } from "wouter";
import AdminGuard from "@/components/admin-guard";
import AdminUsersComponent from "./admin-users-component";
import BetaFeatureComponent from "./beta-feature-component";
import AdminFeedback from "./admin-feedback";
import AdminErrorLogs from "./admin-error-logs";
import WaitlistManagement from "@/components/WaitlistManagement";
import UserAnalytics from "@/components/UserAnalyticsSimple";
import BillingManagement from "@/components/BillingManagement";
import AdminEditorsContent from "./admin-editors";


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  
  useEffect(() => {
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['users', 'editors', 'features', 'waitlist', 'feedback', 'errors', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  return (
    <AdminGuard>
      <div className="w-full min-h-screen">
        <div className="flex flex-col space-y-4 mb-4 sm:mb-6 px-6 pt-6">
          <div className="mb-4"></div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
            <Link href="/admin/user-roles">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Advanced User Roles
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 w-full px-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="grid w-full grid-cols-7 min-w-max sm:min-w-0">
              <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="editors" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Editors</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Billing</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Beta Configuration</span>
              </TabsTrigger>
              <TabsTrigger value="waitlist" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Waitlist</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Feedback</span>
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Error Log</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="w-full overflow-x-hidden">
            <TabsContent value="users" className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">User Analytics & Management</h2>
                <UserAnalytics />
              </div>
            </TabsContent>

            <TabsContent value="editors" className="space-y-4 sm:space-y-6">
              <AdminEditorsContent />
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 sm:space-y-6">
              <BillingManagement />
            </TabsContent>

            <TabsContent value="features" className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Beta Feature Configuration</h2>
                <BetaFeatureComponent />
              </div>
            </TabsContent>

            <TabsContent value="waitlist" className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Waitlist Management</h2>
                <WaitlistManagement />
              </div>
            </TabsContent>

            <TabsContent value="feedback" className="space-y-4 sm:space-y-6">
              <AdminFeedback />
            </TabsContent>

            <TabsContent value="errors" className="space-y-4 sm:space-y-6">
              <AdminErrorLogs />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminGuard>
  );
}