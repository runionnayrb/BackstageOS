import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Mail, Eye, EyeOff, Save, Plus, Send } from "lucide-react";
import type { WaitlistEmailSettings, InsertWaitlistEmailSettings } from "@shared/schema";

interface Variable {
  name: string;
  description: string;
  example: string;
}

const AVAILABLE_VARIABLES: Variable[] = [
  { name: "{{firstName}}", description: "User's first name", example: "John" },
  { name: "{{lastName}}", description: "User's last name", example: "Doe" },
  { name: "{{position}}", description: "Position in waitlist", example: "42" },
  { name: "{{email}}", description: "User's email address", example: "john@example.com" },
  { name: "{{date}}", description: "Current date", example: "January 1, 2025" },
];

export default function WaitlistEmailSettings() {
  const [showPreview, setShowPreview] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [previewData, setPreviewData] = useState({
    firstName: "John",
    lastName: "Doe",
    position: "42",
    email: "john@example.com",
    date: new Date().toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current email settings
  const { data: emailSettings, isLoading } = useQuery<WaitlistEmailSettings>({
    queryKey: ["/api/waitlist/email-settings"],
  });

  // Fetch available domain emails
  const { data: domainEmails } = useQuery<Array<{ email: string; name: string }>>({
    queryKey: ["/api/domain-emails"],
  });


  // Save email settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: InsertWaitlistEmailSettings) => {
      if (emailSettings?.id) {
        return await apiRequest("PUT", `/api/waitlist/email-settings/${emailSettings.id}`, data);
      } else {
        return await apiRequest("POST", "/api/waitlist/email-settings", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist/email-settings"] });
      toast({
        title: "Settings Saved",
        description: "Email settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
      console.error("Save error:", error);
    },
  });


  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (testEmail: string) => {
      return await apiRequest("POST", "/api/waitlist/send-test-email", { 
        testEmail,
        emailSettings: formData 
      });
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Test email has been sent successfully.",
      });
      setShowTestEmail(false);
      setTestEmailAddress("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send test email. Please check your API settings.",
        variant: "destructive",
      });
      console.error("Send test email error:", error);
    },
  });


  const [formData, setFormData] = useState<InsertWaitlistEmailSettings>({
    fromEmail: "hello@backstageos.com",
    fromName: emailSettings?.fromName || "BackstageOS",
    subject: emailSettings?.subject || "Welcome to the BackstageOS Waitlist!",
    bodyHtml: emailSettings?.bodyHtml || getDefaultHtmlBody(),
    bodyText: emailSettings?.bodyText || getDefaultTextBody(),
    isEnabled: emailSettings?.isEnabled ?? true,
  });

  // Clean email address by removing duplicates
  const cleanEmailAddress = (email: string): string => {
    if (!email) return "hello@backstageos.com";
    
    // Find the first @ symbol to determine if there's duplication
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return "hello@backstageos.com";
    
    // Extract the part after the first @
    const afterAt = email.substring(atIndex);
    
    // If the email contains the same domain twice, extract just one instance
    if (email.includes('hello@backstageos.com')) {
      return 'hello@backstageos.com';
    }
    
    // For other emails, check if they contain duplicated parts
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+/;
    const match = email.match(emailRegex);
    return match ? match[0] : "hello@backstageos.com";
  };

  // Update form data when email settings load
  useEffect(() => {
    if (emailSettings) {
      setFormData({
        fromEmail: cleanEmailAddress(emailSettings.fromEmail || "hello@backstageos.com"),
        fromName: emailSettings.fromName || "BackstageOS",
        subject: emailSettings.subject || "Welcome to the BackstageOS Waitlist!",
        bodyHtml: emailSettings.bodyHtml || getDefaultHtmlBody(),
        bodyText: emailSettings.bodyText || getDefaultTextBody(),
        isEnabled: emailSettings.isEnabled ?? true,
      });
    }
  }, [emailSettings]);

  const handleSave = () => {
    // Convert camelCase form data to snake_case for API
    const apiData = {
      fromEmail: formData.fromEmail,
      fromName: formData.fromName,
      subject: formData.subject,
      bodyHtml: formData.bodyHtml,
      bodyText: formData.bodyText,
      isEnabled: formData.isEnabled,
    };
    saveSettingsMutation.mutate(apiData);
  };

  const insertVariable = (field: "subject" | "bodyHtml" | "bodyText", variable: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] + variable
    }));
  };

  const replaceVariables = (text: string | undefined): string => {
    if (!text) return '';
    return text
      .replace(/{{firstName}}/g, previewData.firstName)
      .replace(/{{lastName}}/g, previewData.lastName)
      .replace(/{{position}}/g, previewData.position)
      .replace(/{{email}}/g, previewData.email)
      .replace(/{{date}}/g, previewData.date);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading email settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Waitlist Email Settings
              </CardTitle>
              <CardDescription>
                Configure automatic emails sent to users when they join the waitlist.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showTestEmail} onOpenChange={setShowTestEmail}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Test Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send Test Email</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-email">Email Address</Label>
                      <Input
                        id="test-email"
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="test@example.com"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowTestEmail(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          if (testEmailAddress.trim()) {
                            sendTestEmailMutation.mutate(testEmailAddress);
                          }
                        }}
                        disabled={sendTestEmailMutation.isPending || !testEmailAddress.trim()}
                      >
                        {sendTestEmailMutation.isPending ? "Sending..." : "Send Test"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email enabled toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is-enabled"
              checked={formData.isEnabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
            />
            <Label htmlFor="is-enabled">Send automatic welcome emails</Label>
          </div>

          {/* From email selection */}
          <div className="space-y-2">
            <Label htmlFor="from-email">From Email</Label>
            <Select
              value={formData.fromEmail}
              onValueChange={(value) => setFormData(prev => ({ ...prev, fromEmail: value }))}
            >
              <SelectTrigger className="w-full min-w-[300px]">
                <SelectValue placeholder="Select email address" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const emailOptions = new Set<string>();
                  emailOptions.add("hello@backstageos.com");
                  
                  // Add cleaned domain emails, avoiding duplicates
                  domainEmails?.filter(email => email.email && email.email.trim() !== '').forEach((email) => {
                    const cleanEmail = cleanEmailAddress(email.email);
                    if (cleanEmail && cleanEmail !== "hello@backstageos.com") {
                      emailOptions.add(cleanEmail);
                    }
                  });
                  
                  return Array.from(emailOptions).map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>

          {/* From name */}
          <div className="space-y-2">
            <Label htmlFor="from-name">From Name</Label>
            <Input
              id="from-name"
              value={formData.fromName}
              onChange={(e) => setFormData(prev => ({ ...prev, fromName: e.target.value }))}
              placeholder="BackstageOS"
            />
          </div>

          {/* Subject line */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject Line</Label>
              <div className="flex gap-1">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Button
                    key={variable.name}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable("subject", variable.name)}
                    title={`${variable.description} (${variable.example})`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {variable.name}
                  </Button>
                ))}
              </div>
            </div>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Welcome to the BackstageOS Waitlist!"
            />
          </div>

          {/* Email Body - Gmail Style */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email Body</Label>
              <div className="flex gap-1">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Button
                    key={variable.name}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable("bodyHtml", variable.name)}
                    title={`${variable.description} (${variable.example})`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {variable.name}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Gmail-style compose area */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Email header section */}
              <div className="bg-gray-50 p-4 border-b space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 w-16">From:</span>
                  <div className="flex items-center space-x-2 flex-1">
                    <Select
                      value={formData.fromEmail}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fromEmail: value }))}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select email address" />
                      </SelectTrigger>
                      <SelectContent>
                        {domainEmails?.map((email) => (
                          <SelectItem key={email.email} value={email.email}>
                            {email.name} &lt;{email.email}&gt;
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Email</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.fromEmail === "custom" && (
                      <Input
                        value=""
                        onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
                        placeholder="Enter email address"
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 w-16">To:</span>
                  <span className="text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded">
                    Waitlist subscribers ({"{{email}}"})
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 w-16">Subject:</span>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Email subject line"
                    className="flex-1"
                  />
                </div>
              </div>
              
              {/* Rich text editor */}
              <div className="p-0">
                <RichTextEditor
                  content={formData.bodyHtml}
                  onChange={(html) => {
                    // Convert HTML to plain text for the bodyText field
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    const plainText = tempDiv.textContent || tempDiv.innerText || '';
                    
                    setFormData(prev => ({ 
                      ...prev, 
                      bodyHtml: html,
                      bodyText: plainText
                    }));
                  }}
                  placeholder="Compose your email message..."
                  className="min-h-[300px] border-0"
                />
              </div>
            </div>
          </div>

          {/* Preview toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>

            <Button
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
            <CardDescription>
              Preview how the email will look with sample data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview data controls */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="preview-first-name" className="text-xs">First Name</Label>
                <Input
                  id="preview-first-name"
                  value={previewData.firstName}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="preview-last-name" className="text-xs">Last Name</Label>
                <Input
                  id="preview-last-name"
                  value={previewData.lastName}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="preview-position" className="text-xs">Position</Label>
                <Input
                  id="preview-position"
                  value={previewData.position}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, position: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="preview-email" className="text-xs">Email</Label>
                <Input
                  id="preview-email"
                  value={previewData.email}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, email: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="preview-date" className="text-xs">Date</Label>
                <Input
                  id="preview-date"
                  value={previewData.date}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, date: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Email preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-4 border-b">
                <div className="text-sm text-gray-600">From: {formData.fromName} &lt;{formData.fromEmail}&gt;</div>
                <div className="text-sm text-gray-600">Subject: {replaceVariables(formData.subject)}</div>
              </div>
              <div className="p-4 font-mono text-sm whitespace-pre-wrap">
                {replaceVariables(formData.bodyText)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getDefaultHtmlBody(): string {
  return `<h2>Welcome to the BackstageOS Waitlist!</h2>

<p>Hi {{firstName}},</p>

<p>Thank you for joining the BackstageOS waitlist! I'm excited to have you as part of our community of professional stage managers. I'm working hard to build the future of stage management technology.</p>

<p><strong>Your waitlist position:</strong> #{{position}}</p>

<p>BackstageOS will revolutionize how you manage productions with:</p>

<ul>
  <li>Comprehensive stage management tools</li>
  <li>Advanced scheduling and availability management</li>
  <li>Real-time collaboration features, including real-time document edits, file sharing, and team chatting features</li>
  <li>Advanced script editing is directly integrated with calling script creation and management</li>
  <li>Create a PDF, download it, attach it to an email, review it and then send it all from within the app</li>
  <li>Props lists, scene breakdowns, french scene breakdowns, light cues, audio cues, video cues, lineset schedules, etc.</li>
  <li>And so much more.</li>
</ul>

<p>I'll continue to keep you updated on our progress and let you know as soon as beta access becomes available.</p>

<p>Thank you for your patience and interest!</p>

<p>Best regards, Bryan at BackstageOS</p>`;
}

function getDefaultTextBody(): string {
  return `Welcome to the BackstageOS Waitlist!

Hi {{firstName}},

Thank you for joining the BackstageOS waitlist! We're excited to have you as part of our community of professional stage managers.

Your waitlist position: #{{position}}

We're working hard to build the future of stage management technology. BackstageOS will revolutionize how you manage productions with:

- Comprehensive production management tools
- Real-time collaboration features  
- Advanced script editing and cue management
- Seamless team coordination

We'll keep you updated on our progress and let you know as soon as beta access becomes available.

Thank you for your patience and interest!

Best regards,
The BackstageOS Team

---
You're receiving this email because you joined the BackstageOS waitlist on {{date}}. 
If you have any questions, please reply to this email.`;
}