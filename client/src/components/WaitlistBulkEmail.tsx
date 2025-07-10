import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Mail, Send, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WaitlistEmailSettings } from "@shared/schema";

interface WaitlistStats {
  total: number;
  pending: number;
  contacted: number;
  converted: number;
  declined: number;
}

interface BulkEmailData {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export default function WaitlistBulkEmail() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch waitlist stats to show how many people will receive the email
  const { data: stats } = useQuery<WaitlistStats>({
    queryKey: ["/api/waitlist/stats"],
  });

  // Fetch current email settings for default values
  const { data: emailSettings } = useQuery<WaitlistEmailSettings>({
    queryKey: ["/api/waitlist/email-settings"],
  });

  // Send bulk email mutation
  const sendBulkEmailMutation = useMutation({
    mutationFn: async (data: BulkEmailData) => {
      return await apiRequest("POST", "/api/waitlist/send-bulk-email", data);
    },
    onSuccess: (result) => {
      toast({
        title: "Bulk Email Sent Successfully",
        description: `Email sent to ${result.emailsSent} waitlist members.`,
      });
      setIsDialogOpen(false);
      setSubject("");
      setHtmlContent("");
      setIsConfirming(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error Sending Bulk Email",
        description: error.message || "Failed to send bulk email. Please try again.",
        variant: "destructive",
      });
      console.error("Bulk email error:", error);
    },
  });

  const handleOpenDialog = () => {
    // Set default subject from email settings
    if (emailSettings?.subject && !subject) {
      setSubject("Update from BackstageOS");
    }
    setIsDialogOpen(true);
  };

  const handleSendEmail = () => {
    if (!subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter an email subject.",
        variant: "destructive",
      });
      return;
    }

    if (!htmlContent.trim()) {
      toast({
        title: "Email Content Required", 
        description: "Please enter email content.",
        variant: "destructive",
      });
      return;
    }

    // Convert HTML to plain text for bodyText
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const bodyText = tempDiv.textContent || tempDiv.innerText || '';

    const emailData: BulkEmailData = {
      subject: subject.trim(),
      bodyHtml: htmlContent,
      bodyText: bodyText
    };

    sendBulkEmailMutation.mutate(emailData);
  };

  const handleConfirmSend = () => {
    setIsConfirming(true);
  };

  const cancelSend = () => {
    setIsConfirming(false);
  };

  const recipientCount = parseInt(stats?.total as string) || 0;
  const activeRecipients = (parseInt(stats?.pending as string) || 0) + (parseInt(stats?.contacted as string) || 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Bulk Email to Waitlist
          </CardTitle>
          <CardDescription>
            Send updates and announcements to everyone on your waitlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Total Recipients: <strong>{recipientCount}</strong>
                  </span>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Active: {activeRecipients}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                Emails will be sent to all waitlist members (pending and contacted status).
              </p>
            </div>
            <Button 
              onClick={handleOpenDialog}
              className="flex items-center gap-2"
              disabled={recipientCount === 0}
            >
              <Send className="h-4 w-4" />
              Compose Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {isConfirming ? "Confirm Bulk Email" : "Compose Bulk Email"}
            </DialogTitle>
          </DialogHeader>

          {!isConfirming ? (
            <div className="space-y-6">
              {/* Email Composition Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from">From</Label>
                    <Input
                      id="from"
                      value={`${emailSettings?.fromName || "BackstageOS"} <${emailSettings?.fromEmail || "hello@backstageos.com"}>`}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to">To</Label>
                    <Input
                      id="to"
                      value={`${recipientCount} waitlist members`}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Content</Label>
                  <RichTextEditor
                    content={htmlContent}
                    onChange={setHtmlContent}
                    placeholder="Write your message to waitlist members..."
                    className="min-h-[300px]"
                  />
                </div>

                {/* Variable Insertion Buttons */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Insert Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const variable = "{{firstName}}";
                        setHtmlContent(prev => prev + variable);
                      }}
                      className="text-xs bg-white hover:bg-blue-100"
                    >
                      + First Name
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const variable = "{{lastName}}";
                        setHtmlContent(prev => prev + variable);
                      }}
                      className="text-xs bg-white hover:bg-blue-100"
                    >
                      + Last Name
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const variable = "{{position}}";
                        setHtmlContent(prev => prev + variable);
                      }}
                      className="text-xs bg-white hover:bg-blue-100"
                    >
                      + Position
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const variable = "{{email}}";
                        setHtmlContent(prev => prev + variable);
                      }}
                      className="text-xs bg-white hover:bg-blue-100"
                    >
                      + Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const variable = "{{date}}";
                        setHtmlContent(prev => prev + variable);
                      }}
                      className="text-xs bg-white hover:bg-blue-100"
                    >
                      + Current Date
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Click any button to insert the variable at the end of your email content. Variables will be replaced with actual values when emails are sent.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSend}
                  disabled={!subject.trim() || !htmlContent.trim()}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Review & Send
                </Button>
              </div>
            </div>
          ) : (
            /* Confirmation Screen */
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Confirm Bulk Email</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      You are about to send this email to <strong>{recipientCount} waitlist members</strong>. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="border rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="space-y-1 text-sm">
                    <div><strong>From:</strong> {emailSettings?.fromName || "BackstageOS"} &lt;{emailSettings?.fromEmail || "hello@backstageos.com"}&gt;</div>
                    <div><strong>To:</strong> {recipientCount} waitlist members</div>
                    <div><strong>Subject:</strong> {subject}</div>
                  </div>
                </div>
                <div className="p-4">
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={cancelSend}
                  disabled={sendBulkEmailMutation.isPending}
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={sendBulkEmailMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {sendBulkEmailMutation.isPending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send to {recipientCount} Recipients
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}