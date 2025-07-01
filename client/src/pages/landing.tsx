import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Calendar, Clapperboard, Settings, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Hero Content */}
        <div className="text-white space-y-8">
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight">
              BackstageOS
            </h1>
            <p className="text-xl lg:text-2xl opacity-90 leading-relaxed">
              The complete stage management platform for modern theater professionals
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Clapperboard className="h-4 w-4" />
              </div>
              <span>Show-Centric Organization</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <span>Professional Reports & Templates</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <span>Team & Cast Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
              <span>Scheduling & Call Sheets</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Settings className="h-4 w-4" />
              </div>
              <span>Script & Cue Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <span>Secure Collaboration</span>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="max-w-md mx-auto w-full">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Get Started</h2>
              <p className="text-gray-600">Join Professional Stage Managers Worldwide</p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3"
                size="lg"
              >
                Sign In / Sign Up
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Secure authentication powered by Replit</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                By signing in, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
