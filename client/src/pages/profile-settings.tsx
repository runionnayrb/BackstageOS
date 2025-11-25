import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save, Key, Mail, User, Eye, EyeOff, MailPlus, CheckCircle2, XCircle, Link as LinkIcon, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { SiGmail } from "react-icons/si";
import { MdOutlineMail } from "react-icons/md";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailProviderData {
  provider: string | null;
  emailAddress: string | null;
  connectedAt: string | null;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState<'gmail' | 'outlook' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // Handle OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        queryClient.invalidateQueries({ queryKey: ["/api/user/email-provider"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        setIsConnecting(null);
      } else if (event.data?.type === 'oauth-error') {
        setErrorMessage(event.data.message || 'OAuth failed');
        setIsConnecting(null);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient]);

  const togglePasswordVisibility = (field: keyof typeof passwordVisibility) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const { data: emailProvider, isLoading: isLoadingProvider } = useQuery<EmailProviderData>({
    queryKey: ['/api/user/email-provider'],
  });

  const initiateOAuth = async (provider: 'gmail' | 'outlook') => {
    setIsConnecting(provider);
    setErrorMessage(null);
    try {
      const endpoint = provider === 'gmail' 
        ? '/api/oauth/google/initiate' 
        : '/api/oauth/microsoft/initiate';
      
      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate OAuth');
      }
      
      const data = await response.json();
      
      // Open OAuth in popup window to avoid Vite HMR issues
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to start email connection.");
      setIsConnecting(null);
    }
  };

  const disconnectProviderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/user/email-provider/disconnect");
    },
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/user/email-provider"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to disconnect email provider.");
    },
  });

  const [testEmailSuccess, setTestEmailSuccess] = useState(false);
  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/user/email-provider/test");
    },
    onSuccess: (data) => {
      setErrorMessage(null);
      setTestEmailSuccess(true);
      setTimeout(() => setTestEmailSuccess(false), 5000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to send test email.");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response.json();
    },
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setProfileData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to update profile.");
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
    };

    // Only include password fields if user is trying to change password
    if (profileData.newPassword) {
      if (profileData.newPassword !== profileData.confirmPassword) {
        setErrorMessage("New password and confirmation don't match.");
        return;
      }
      
      if (!profileData.currentPassword) {
        setErrorMessage("Please enter your current password to change it.");
        return;
      }

      updateData.currentPassword = profileData.currentPassword;
      updateData.newPassword = profileData.newPassword;
    }

    updateProfileMutation.mutate(updateData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8"></div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and security settings.
            </p>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your name and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MailPlus className="h-5 w-5" />
                  Email Integration
                </CardTitle>
                <CardDescription>
                  Connect your Gmail or Outlook account to send emails directly from Backstage OS using your own email address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingProvider ? (
                  <div className="text-sm text-muted-foreground">Loading email provider status...</div>
                ) : emailProvider?.provider ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-start gap-3 flex-1">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {emailProvider.provider === 'gmail' ? (
                              <>
                                <SiGmail className="h-4 w-4 text-red-500" />
                                <span className="font-medium text-green-900 dark:text-green-100">Gmail Connected</span>
                              </>
                            ) : (
                              <>
                                <MdOutlineMail className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-green-900 dark:text-green-100">Outlook Connected</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300 break-all">
                            {emailProvider.emailAddress}
                          </div>
                          {emailProvider.connectedAt && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Connected {format(new Date(emailProvider.connectedAt), "MMM dd, yyyy 'at' h:mm a")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendTestEmailMutation.mutate()}
                          disabled={sendTestEmailMutation.isPending}
                          data-testid="button-test-email"
                        >
                          {sendTestEmailMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4 mr-1" />
                          )}
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectProviderMutation.mutate()}
                          disabled={disconnectProviderMutation.isPending}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          data-testid="button-disconnect-email"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                    {testEmailSuccess && (
                      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                          Test email sent! Check your inbox at {emailProvider.emailAddress}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      No email provider connected. Choose one to get started:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto p-4 justify-start"
                        onClick={() => initiateOAuth('gmail')}
                        disabled={isConnecting !== null}
                        data-testid="button-connect-gmail"
                      >
                        {isConnecting === 'gmail' ? (
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                        ) : (
                          <SiGmail className="h-5 w-5 text-red-500 mr-3" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">Connect Gmail</div>
                          <div className="text-xs text-muted-foreground">Send emails from your Google account</div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto p-4 justify-start"
                        onClick={() => initiateOAuth('outlook')}
                        disabled={isConnecting !== null}
                        data-testid="button-connect-outlook"
                      >
                        {isConnecting === 'outlook' ? (
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                        ) : (
                          <MdOutlineMail className="h-5 w-5 text-blue-500 mr-3" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">Connect Outlook</div>
                          <div className="text-xs text-muted-foreground">Send emails from your Microsoft account</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Change your password to keep your account secure. Leave blank to keep current password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Password Last Updated Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Password last updated:
                  </div>
                  <div className="text-sm font-medium">
                    {user?.updatedAt ? format(new Date(user.updatedAt), "MMM dd, yyyy 'at' h:mm a") : "Never"}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type={passwordVisibility.currentPassword ? "text" : "password"}
                      value={profileData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="Enter your current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('currentPassword')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {passwordVisibility.currentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={passwordVisibility.newPassword ? "text" : "password"}
                      value={profileData.newPassword}
                      onChange={handleInputChange}
                      placeholder="Enter a new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {passwordVisibility.newPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={passwordVisibility.confirmPassword ? "text" : "password"}
                      value={profileData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {passwordVisibility.confirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateProfileMutation.isPending ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}