import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { FileText, Users, Calendar, Clapperboard, Settings, Shield } from "lucide-react";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get('mode');
  const [isLogin, setIsLogin] = useState(modeParam !== 'signup');
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const { loginMutation, registerMutation, user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    setIsLogin(mode !== 'signup');
  }, [location]);

  if (user) {
    const returnPath = sessionStorage.getItem('returnToJoin');
    const params = new URLSearchParams(window.location.search);
    const fromPricing = params.get('from') === 'pricing';
    
    if (returnPath) {
      sessionStorage.removeItem('returnToJoin');
      window.location.href = returnPath;
    } else if (fromPricing) {
      window.location.href = "/onboarding";
    } else {
      window.location.href = "/";
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password,
      });
    } else {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const toggleMode = () => {
    const newMode = isLogin ? 'signup' : 'login';
    setLocation(`/auth?mode=${newMode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4 pb-12 lg:pb-0">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-white space-y-8 pt-6 lg:pt-16">
          <div className="text-center lg:text-left">
            <Link href="/">
              <h1 className="text-4xl lg:text-6xl mb-4 leading-tight cursor-pointer hover:opacity-90 transition-opacity">
                <span style={{ fontWeight: 400 }}>Backstage</span>
                <span style={{ fontWeight: 700 }}>OS</span>
              </h1>
            </Link>
            <p className="text-xl lg:text-2xl opacity-90 leading-relaxed">
              The complete stage management platform for professional stage managers
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

        <Card className="max-w-md mx-auto w-full">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {isLogin ? "Welcome Back" : "Get Started"}
              </h2>
              <p className="text-gray-600">
                {isLogin 
                  ? "Sign in to your account" 
                  : "Join Professional Stage Managers Worldwide"
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                {isLogin && (
                  <div className="text-right mt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLocation('/forgot-password');
                      }}
                      className="text-sm text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <Button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white py-3"
                size="lg"
                disabled={loginMutation.isPending || registerMutation.isPending}
              >
                {loginMutation.isPending || registerMutation.isPending 
                  ? "Please wait..." 
                  : (isLogin ? "Sign In" : "Create Account")
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-primary hover:underline text-sm"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500 space-y-2">
              <p>
                By signing in, you agree to our{" "}
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </p>
              <p>
                Learn more about our{" "}
                <a href="/security" className="text-primary hover:underline">
                  Security Practices
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
