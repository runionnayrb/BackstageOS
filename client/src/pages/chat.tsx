import { MessageCircle, Clock, Users, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Chat</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Real-time messaging for your teams. Connect instantly with cast, crew, and creative teams during rehearsals and performances.
        </p>
        <Badge variant="secondary" className="mt-4">
          Coming Soon
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Instant Messaging</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Send quick messages during rehearsals and tech. Get instant responses from your team when timing is critical.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Channels</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Organized channels for different departments: Stage Management, Lighting, Sound, Wardrobe, and more.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Show Integration</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Chat automatically organized by show. Easy switching between productions with complete message history.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-dashed border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-gray-700">Feature in Development</CardTitle>
          <CardDescription className="text-gray-500">
            We're building a comprehensive chat system designed specifically for stage managers. 
            Stay tuned for updates!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button disabled variant="secondary">
            Chat System Coming Soon
          </Button>
          <p className="text-sm text-gray-500 mt-3">
            In the meantime, continue using the <strong>Email</strong> system for team communication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}