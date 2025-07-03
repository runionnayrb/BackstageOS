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
      <div className="container mx-auto p-3 sm:p-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
            <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">User </span>Users
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Beta </span>Features
            </TabsTrigger>
            <TabsTrigger value="waitlist" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4" />
              Waitlist
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm col-span-2 sm:col-span-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Error </span>Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-6">User Management</h2>
              <AdminUsersComponent />
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-6">Beta Feature Configuration</h2>
              <BetaFeatureComponent />
            </div>
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-6">Waitlist Management</h2>
              <WaitlistManagement />
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <AdminFeedback />
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <AdminErrorLogs />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}