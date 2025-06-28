import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Settings, MessageSquare, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import AdminGuard from "@/components/admin-guard";
import AdminUsersComponent from "./admin-users-component";
import BetaFeatureComponent from "./beta-feature-component";
import AdminFeedback from "./admin-feedback";
import AdminErrorLogs from "./admin-error-logs";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shows
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Beta Features
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error Logs
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