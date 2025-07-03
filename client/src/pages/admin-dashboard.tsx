import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Settings, MessageSquare, AlertTriangle, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import AdminGuard from "@/components/admin-guard";
import AdminUsersComponent from "./admin-users-component";
import BetaFeatureComponent from "./beta-feature-component";
import AdminFeedback from "./admin-feedback";
import AdminErrorLogs from "./admin-error-logs";
import WaitlistManagement from "@/components/WaitlistManagement";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <AdminGuard>
      <div className="w-full min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6 px-6 pt-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shows
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 w-full px-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="grid w-full grid-cols-5 min-w-max sm:min-w-0">
              <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Features</span>
              </TabsTrigger>
              <TabsTrigger value="waitlist" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Waitlist</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Feedback</span>
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Logs</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="w-full overflow-x-hidden">
            <TabsContent value="users" className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">User Management</h2>
                <AdminUsersComponent />
              </div>
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