import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Mail, Server, CheckCircle, XCircle, Smartphone, Monitor } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function EmailSetupPage() {
  // Get IMAP server status
  const { data: serverStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/email/imap-server/status'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Get setup instructions
  const { data: instructions, isLoading: instructionsLoading } = useQuery({
    queryKey: ['/api/email/imap-setup-instructions'],
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} copied successfully`,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Apple Mail Integration</h1>
        <p className="text-muted-foreground mt-2">
          Add your BackstageOS email to Apple Mail or other email clients for seamless integration
        </p>
      </div>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            IMAP Server Status
          </CardTitle>
          <CardDescription>
            Current status of the email server that powers Apple Mail integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="animate-pulse">Loading server status...</div>
          ) : (
            <div className="flex items-center gap-4">
              {serverStatus?.isRunning ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Running
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Offline
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {serverStatus?.activeConnections || 0} active connections
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {instructions && !instructionsLoading && (
        <>
          {/* Apple Mail Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Apple Mail Setup (iOS/macOS)
              </CardTitle>
              <CardDescription>
                Follow these steps to add your BackstageOS email to Apple Mail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Your Email Account</h3>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Mail className="h-4 w-4" />
                    <code className="text-sm">{instructions.emailAddress}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(instructions.emailAddress, "Email address")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Setup Steps</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    {instructions.appleMailSteps.map((step, index) => (
                      <li key={index} className="text-muted-foreground">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server Settings */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Incoming Mail Server */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Incoming Mail Server (IMAP)</CardTitle>
                <CardDescription>
                  Use these settings if Apple Mail doesn't configure automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Server</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm p-2 bg-muted rounded flex-1">
                        {instructions.serverSettings.incomingServer.server}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(
                          instructions.serverSettings.incomingServer.server,
                          "Incoming server"
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Port</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm p-2 bg-muted rounded flex-1">
                        {instructions.serverSettings.incomingServer.port}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(
                          instructions.serverSettings.incomingServer.port.toString(),
                          "Port"
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Security</label>
                    <div className="mt-1">
                      <code className="text-sm p-2 bg-muted rounded">
                        {instructions.serverSettings.incomingServer.security}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outgoing Mail Server */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outgoing Mail Server (SMTP)</CardTitle>
                <CardDescription>
                  Settings for sending emails from Apple Mail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Server</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm p-2 bg-muted rounded flex-1">
                        {instructions.serverSettings.outgoingServer.server}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(
                          instructions.serverSettings.outgoingServer.server,
                          "Outgoing server"
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Port</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm p-2 bg-muted rounded flex-1">
                        {instructions.serverSettings.outgoingServer.port}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(
                          instructions.serverSettings.outgoingServer.port.toString(),
                          "Port"
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Security</label>
                    <div className="mt-1">
                      <code className="text-sm p-2 bg-muted rounded">
                        {instructions.serverSettings.outgoingServer.security}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Login Credentials
              </CardTitle>
              <CardDescription>
                Use your BackstageOS credentials to authenticate with the email server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm p-2 bg-muted rounded flex-1">
                      {instructions.emailAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(instructions.emailAddress, "Username")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <div className="mt-1">
                    <code className="text-sm p-2 bg-muted rounded">
                      Your BackstageOS password
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Benefits of Apple Mail Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Access BackstageOS emails in your preferred email app
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Two-way sync: read status updates across all devices
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Send emails using your professional @backstageos.com address
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Offline access to your theater communications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Native integration with iOS and macOS devices
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {instructionsLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse text-center">
              Loading setup instructions...
            </div>
          </CardContent>
        </Card>
      )}

      {!instructions && !instructionsLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No email account found. Create an email account first to use Apple Mail integration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}