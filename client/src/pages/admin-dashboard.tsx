import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Settings } from "lucide-react";
import { Link } from "wouter";
import AdminGuard from "@/components/admin-guard";
import AdminUsersComponent from "./admin-users-component";
import BetaFeatureComponent from "./beta-feature-component";

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
            <p className="text-muted-foreground">
              Manage users, permissions, and beta feature access
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Beta Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, profile types, and beta access levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminUsersComponent />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Beta Feature Configuration</CardTitle>
                <CardDescription>
                  Define which features are available to Limited and Full beta access users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BetaFeatureComponent />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}