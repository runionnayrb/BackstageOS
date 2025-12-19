import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function AppleMailSetupPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/email-setup">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Mail className="h-6 w-6" />
              Apple Mail Setup
            </h1>
            <p className="text-muted-foreground">
              Set up your BackstageOS email with Apple Mail
            </p>
          </div>
        </div>

        {/* Important Notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important Update:</strong> Due to platform limitations, direct IMAP/SMTP server connections aren't supported in deployment. 
            We recommend using the BackstageOS web email interface for the best experience.
          </AlertDescription>
        </Alert>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              What's Working
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium">Email Receiving</p>
                  <p className="text-sm text-muted-foreground">
                    Emails sent to your BackstageOS address are received and stored
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium">Web Email Interface</p>
                  <p className="text-sm text-muted-foreground">
                    Full email management available in BackstageOS
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium">Email Sending</p>
                  <p className="text-sm text-muted-foreground">
                    Send emails through the BackstageOS interface
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We've built a complete IMAP/SMTP server system for BackstageOS, but Replit's deployment platform 
              only supports standard web ports (80, 443, and a few others). Email ports like 587 (SMTP) and 
              993 (IMAP) aren't accessible from external mail clients.
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">What This Means:</h4>
              <ul className="text-sm space-y-1">
                <li>• Apple Mail can't connect directly to BackstageOS email servers</li>
                <li>• Your BackstageOS email works perfectly within the web interface</li>
                <li>• Email forwarding to your personal email is still available</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Alternative Solutions */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Alternatives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Option 1: Use BackstageOS Web Interface</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Access your BackstageOS email directly in the web app for full functionality
                </p>
                <Link href="/email">
                  <Button size="sm">
                    Open Email
                  </Button>
                </Link>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Option 2: Email Forwarding</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Forward BackstageOS emails to your personal Apple Mail account
                </p>
                <Link href="/email-setup/forwarding">
                  <Button size="sm" variant="outline">
                    Configure Forwarding
                  </Button>
                </Link>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Option 3: Email Notifications</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Get notified on your phone when BackstageOS emails arrive
                </p>
                <Link href="/settings/notifications">
                  <Button size="sm" variant="outline">
                    Setup Notifications
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Future Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Future Development</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We're exploring solutions for native email client integration, including:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Third-party email service integration</li>
              <li>• Alternative deployment platforms with full port access</li>
              <li>• Mobile app with native email support</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}