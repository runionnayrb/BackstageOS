import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Calendar, Clapperboard, Settings, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary to-secondary">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center w-full">
        {/* Hero Content */}
        <div className="text-white space-y-8">
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight">
              BackstageOS
            </h1>
            <p className="text-xl lg:text-2xl opacity-90 leading-relaxed">
              One System. One Place. One Truth.
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
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>
                {" "}and{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-black/30 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4">
            <p className="text-sm opacity-90">© 2025 BackstageOS. All rights reserved.<span className="block sm:inline"> Created by Bryan Runion</span></p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="/security" className="hover:opacity-80 transition">Security</a>
              <a href="/privacy" className="hover:opacity-80 transition">Privacy Policy</a>
              <a href="/terms" className="hover:opacity-80 transition">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
