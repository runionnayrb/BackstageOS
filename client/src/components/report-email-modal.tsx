import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, Send, Loader2, Paperclip, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from "lucide-react";
import jsPDF from "jspdf";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

interface DistributionList {
  id: number;
  name: string;
  toRecipients: string[] | null;
  ccRecipients: string[] | null;
  bccRecipients: string[] | null;
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  signature: string | null;
}

interface EmailAccount {
  id: number;
  email: string;
  provider: string;
  isPrimary: boolean;
}

interface ReportNote {
  id: number;
  content: string;
  status: string;
  priority: string;
  department: string;
  assignee: string | null;
}

interface ReportEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  reportTypeId: number;
  report: {
    id: number;
    title: string;
    date: string;
    content: Record<string, any>;
  };
  project: {
    id: number;
    name: string;
  };
  template: {
    id: number;
    name: string;
    sections: Array<{
      id: number;
      title: string;
      fields: Array<{
        id: number;
        label: string;
        type: string;
        defaultValue?: string;
      }>;
    }>;
  } | null;
  contentRef: React.MutableRefObject<Record<string, any>>;
  globalTemplateSettings: any;
}

export function ReportEmailModal({
  isOpen,
  onClose,
  projectId,
  reportTypeId,
  report,
  project,
  template,
  contentRef,
  globalTemplateSettings,
}: ReportEmailModalProps) {
  const { toast } = useToast();
  const [toAddresses, setToAddresses] = useState<string[]>([]);
  const [ccAddresses, setCcAddresses] = useState<string[]>([]);
  const [bccAddresses, setBccAddresses] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [newEmail, setNewEmail] = useState({ to: "", cc: "", bcc: "" });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const hasInitializedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
        strike: false,
      }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 [&_ul]:text-inherit [&_li]:text-inherit [&_h3]:text-inherit',
      },
    },
  });

  const { data: assignedDistro } = useQuery<DistributionList>({
    queryKey: [`/api/projects/${projectId}/report-types/${reportTypeId}/distro`],
    enabled: isOpen && !!reportTypeId,
  });

  const { data: emailAccounts = [] } = useQuery<EmailAccount[]>({
    queryKey: ["/api/email/accounts"],
    enabled: isOpen,
  });

  const { data: reportNotes = [] } = useQuery<ReportNote[]>({
    queryKey: [`/api/projects/${projectId}/reports/${report.id}/notes`],
    enabled: isOpen && !!report.id,
  });

  const replaceTemplateVariables = (text: string): string => {
    if (!text) return "";
    const reportDate = new Date(report.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const shortDate = new Date(report.date).toLocaleDateString();
    const reportTypeName = template?.name || "Report";
    
    const replacements: Record<string, string> = {
      "Report Name": reportTypeName,
      "report name": reportTypeName,
      "reportName": reportTypeName,
      "Show Name": project.name,
      "show name": project.name,
      "showName": project.name,
      "Report Title": report.title,
      "report title": report.title,
      "reportTitle": report.title,
      "Report Date": reportDate,
      "report date": reportDate,
      "reportDate": reportDate,
      "Date": reportDate,
      "date": reportDate,
      "Short Date": shortDate,
      "shortDate": shortDate,
      "Report Type": reportTypeName,
      "report type": reportTypeName,
      "reportType": reportTypeName,
      "Project Name": project.name,
      "project name": project.name,
      "projectName": project.name,
    };
    
    let result = text;
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(regex, value);
    }
    return result;
  };

  const stripHtml = (html: string): string => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const generateReportContentHtml = (): string => {
    if (!template?.sections) return "";
    
    let html = "<div style=\"font-family: Arial, sans-serif; max-width: 800px;\">";
    html += `<h2 style="margin-bottom: 8px;">${report.title}</h2>`;
    html += `<p style="color: #666; margin-bottom: 16px;">${project.name} - ${new Date(report.date).toLocaleDateString()}</p>`;
    html += "<hr style=\"border: 0; border-top: 1px solid #ddd; margin: 16px 0;\" />";
    
    for (const section of template.sections) {
      html += `<h3 style="margin-top: 24px; margin-bottom: 12px; color: #333;">${section.title}</h3>`;
      
      if (section.fields?.length > 0) {
        for (const field of section.fields) {
          const fieldContent = contentRef.current[field.label] || field.defaultValue || "";
          const plainContent = stripHtml(fieldContent);
          
          if (plainContent.trim()) {
            html += `<div style="margin-bottom: 16px;">`;
            html += `<strong style="display: block; margin-bottom: 4px;">${field.label}</strong>`;
            html += `<div style="padding-left: 16px; white-space: pre-wrap;">${plainContent}</div>`;
            html += `</div>`;
          }
        }
      }
    }
    
    if (reportNotes.length > 0) {
      html += `<h3 style="margin-top: 24px; margin-bottom: 12px; color: #333;">Notes</h3>`;
      html += `<ul style="margin: 0; padding-left: 20px;">`;
      for (const note of reportNotes) {
        const statusLabel = note.status !== "open" ? ` [${note.status}]` : "";
        const priorityLabel = note.priority === "high" ? " ⚠️" : note.priority === "urgent" ? " 🔴" : "";
        html += `<li style="margin-bottom: 8px;">${note.content}${statusLabel}${priorityLabel}</li>`;
      }
      html += `</ul>`;
    }
    
    html += "</div>";
    return html;
  };

  useEffect(() => {
    if (isOpen && editor && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      if (assignedDistro) {
        setToAddresses(assignedDistro.toRecipients || []);
        setCcAddresses(assignedDistro.ccRecipients || []);
        setBccAddresses(assignedDistro.bccRecipients || []);
        setShowCc((assignedDistro.ccRecipients?.length || 0) > 0);
        setShowBcc((assignedDistro.bccRecipients?.length || 0) > 0);
        
        const subjectText = replaceTemplateVariables(assignedDistro.subjectTemplate || "{{Report Title}} - {{Show Name}}");
        setSubject(subjectText);
        
        let bodyText = replaceTemplateVariables(assignedDistro.bodyTemplate || "");
        if (assignedDistro.signature) {
          bodyText += "\n\n" + assignedDistro.signature;
        }
        setBody(bodyText);
        editor.commands.setContent(bodyText.replace(/\n/g, "<br>"));
      } else {
        const defaultSubject = replaceTemplateVariables("{{Report Title}} - {{Show Name}}");
        setSubject(defaultSubject);
        setBody("");
        editor.commands.setContent("");
      }
    }
    
    if (!isOpen) {
      hasInitializedRef.current = false;
      setToAddresses([]);
      setCcAddresses([]);
      setBccAddresses([]);
      setSubject("");
      setBody("");
      setShowCc(false);
      setShowBcc(false);
      if (editor) {
        editor.commands.setContent('');
      }
    }
  }, [isOpen, assignedDistro, editor]);

  useEffect(() => {
    if (isOpen && emailAccounts.length > 0 && !selectedAccountId) {
      const primaryAccount = emailAccounts.find((acc) => acc.isPrimary);
      setSelectedAccountId(primaryAccount?.id || emailAccounts[0]?.id || null);
    }
  }, [isOpen, emailAccounts, selectedAccountId]);

  const addEmail = (type: "to" | "cc" | "bcc") => {
    const email = newEmail[type].trim();
    if (!email) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    
    const setter = type === "to" ? setToAddresses : type === "cc" ? setCcAddresses : setBccAddresses;
    const current = type === "to" ? toAddresses : type === "cc" ? ccAddresses : bccAddresses;
    
    if (current.includes(email)) {
      toast({ title: "Duplicate", description: "Email already added", variant: "destructive" });
      return;
    }
    
    setter([...current, email]);
    setNewEmail((prev) => ({ ...prev, [type]: "" }));
  };

  const removeEmail = (type: "to" | "cc" | "bcc", index: number) => {
    const setter = type === "to" ? setToAddresses : type === "cc" ? setCcAddresses : setBccAddresses;
    const current = type === "to" ? toAddresses : type === "cc" ? ccAddresses : bccAddresses;
    setter(current.filter((_, i) => i !== index));
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const pdfSettings = globalTemplateSettings?.pdfExport || {
      fontFamily: "helvetica",
      titleSize: 18,
      showNameSize: 16,
      sectionTitleSize: 13,
      fieldTitleSize: 12,
      contentSize: 11,
      lineHeight: 1.4,
      marginTop: 0.5,
      marginBottom: 0.5,
      marginLeft: 1,
      marginRight: 1,
    };

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = pdfSettings.marginLeft * 72;
    const marginRight = pdfSettings.marginRight * 72;
    const marginTop = pdfSettings.marginTop * 72;
    const marginBottom = pdfSettings.marginBottom * 72;
    const contentWidth = pageWidth - marginLeft - marginRight;

    const titleSize = pdfSettings.titleSize;
    const showNameSize = pdfSettings.showNameSize;
    const sectionTitleSize = pdfSettings.sectionTitleSize;
    const fieldTitleSize = pdfSettings.fieldTitleSize;
    const contentSize = pdfSettings.contentSize;
    const lineHeight = pdfSettings.lineHeight;
    const fontFamily = pdfSettings.fontFamily;

    let yPosition = marginTop;

    const checkNewPage = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - marginBottom) {
        pdf.addPage();
        yPosition = marginTop;
        return true;
      }
      return false;
    };

    const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(text, maxWidth);
    };

    const centerX = pageWidth / 2;

    pdf.setFontSize(titleSize);
    pdf.setFont(fontFamily, "bold");
    const titleLines = wrapText(report.title || "Report", contentWidth, titleSize);
    titleLines.forEach((line: string) => {
      checkNewPage(titleSize * lineHeight);
      pdf.text(line, centerX, yPosition, { align: "center" });
      yPosition += titleSize * lineHeight;
    });

    pdf.setFontSize(showNameSize);
    pdf.setFont(fontFamily, "normal");
    if (project.name) {
      const projectLines = wrapText(project.name, contentWidth, showNameSize);
      projectLines.forEach((line: string) => {
        checkNewPage(showNameSize * lineHeight);
        pdf.text(line, centerX, yPosition, { align: "center" });
        yPosition += showNameSize * lineHeight;
      });
    }

    const dateStr = new Date(report.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    pdf.text(dateStr, centerX, yPosition, { align: "center" });
    yPosition += showNameSize * lineHeight;

    pdf.setLineWidth(0.5);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    yPosition += contentSize * lineHeight;

    if (template?.sections) {
      for (const section of template.sections) {
        checkNewPage(sectionTitleSize * lineHeight + 20);

        pdf.setFontSize(sectionTitleSize);
        pdf.setFont(fontFamily, "bold");
        const sectionLines = wrapText(section.title || "", contentWidth, sectionTitleSize);
        sectionLines.forEach((line: string) => {
          checkNewPage(sectionTitleSize * lineHeight);
          pdf.text(line, marginLeft, yPosition);
          yPosition += sectionTitleSize * lineHeight;
        });
        yPosition += 6;

        if (section.fields?.length > 0) {
          for (const field of section.fields) {
            checkNewPage(fieldTitleSize * lineHeight + 10);
            pdf.setFontSize(fieldTitleSize);
            pdf.setFont(fontFamily, "bold");
            const fieldLines = wrapText(field.label || "", contentWidth - 20, fieldTitleSize);
            fieldLines.forEach((line: string) => {
              checkNewPage(fieldTitleSize * lineHeight);
              pdf.text(line, marginLeft + 10, yPosition);
              yPosition += fieldTitleSize * lineHeight;
            });
            yPosition += 2;

            const fieldContent = contentRef.current[field.label] || field.defaultValue || "";
            const plainContent = stripHtml(fieldContent);

            if (plainContent.trim()) {
              pdf.setFontSize(contentSize);
              pdf.setFont(fontFamily, "normal");
              const contentLines = wrapText(plainContent, contentWidth - 30, contentSize);
              contentLines.forEach((line: string) => {
                checkNewPage(contentSize * lineHeight);
                pdf.text(line, marginLeft + 20, yPosition);
                yPosition += contentSize * lineHeight;
              });
            }
            yPosition += 8;
          }
        }
        yPosition += 12;
      }
    }

    return pdf.output("blob");
  };

  const handleSend = async () => {
    if (toAddresses.length === 0) {
      toast({ title: "Error", description: "Please add at least one recipient", variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }
    if (!selectedAccountId) {
      toast({ title: "Error", description: "Please select an email account", variant: "destructive" });
      return;
    }

    setIsSending(true);

    try {
      const pdfBlob = await generatePdfBlob();
      const pdfFileName = `${report.title || "Report"}-${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`;

      let htmlContent = editor?.getHTML() || body.replace(/\n/g, "<br>");
      
      htmlContent += "<br><br>" + generateReportContentHtml();

      const formData = new FormData();
      formData.append("fromAccountId", selectedAccountId.toString());
      formData.append("toAddresses", JSON.stringify(toAddresses));
      if (ccAddresses.length > 0) {
        formData.append("ccAddresses", JSON.stringify(ccAddresses));
      }
      if (bccAddresses.length > 0) {
        formData.append("bccAddresses", JSON.stringify(bccAddresses));
      }
      formData.append("subject", subject);
      formData.append("content", stripHtml(htmlContent));
      formData.append("htmlContent", htmlContent);
      formData.append("attachments", new File([pdfBlob], pdfFileName, { type: "application/pdf" }));

      const response = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      toast({ title: "Success", description: "Email sent successfully with PDF attached" });
      onClose();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setToAddresses([]);
    setCcAddresses([]);
    setBccAddresses([]);
    setSubject("");
    setBody("");
    setNewEmail({ to: "", cc: "", bcc: "" });
    setShowCc(false);
    setShowBcc(false);
    setSelectedAccountId(null);
    onClose();
  };

  const renderEmailSection = (type: "to" | "cc" | "bcc", label: string) => {
    const emails = type === "to" ? toAddresses : type === "cc" ? ccAddresses : bccAddresses;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium w-12">{label}</Label>
          <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[36px] p-1 border rounded-md bg-background">
            {emails.map((email, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {email}
                <button
                  type="button"
                  onClick={() => removeEmail(type, index)}
                  className="ml-1 hover:text-destructive"
                  data-testid={`btn-remove-${type}-email-${index}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input
              type="email"
              placeholder={`Add ${label.toLowerCase()} email...`}
              value={newEmail[type]}
              onChange={(e) => setNewEmail((prev) => ({ ...prev, [type]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail(type);
                }
              }}
              className="flex-1 min-w-[150px] border-0 p-0 h-8 focus-visible:ring-0"
              data-testid={`input-${type}-email`}
            />
          </div>
          {type === "to" && !showCc && (
            <Button variant="ghost" size="sm" onClick={() => setShowCc(true)} data-testid="btn-show-cc">
              Cc
            </Button>
          )}
          {type === "to" && !showBcc && (
            <Button variant="ghost" size="sm" onClick={() => setShowBcc(true)} data-testid="btn-show-bcc">
              Bcc
            </Button>
          )}
        </div>
      </div>
    );
  };

  const selectedAccount = emailAccounts.find((acc) => acc.id === selectedAccountId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Send Report via Email
            <Badge variant="outline" className="ml-2">
              <Paperclip className="h-3 w-3 mr-1" />
              PDF Attached
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">From</Label>
            <Select
              value={selectedAccountId?.toString() || ""}
              onValueChange={(val) => setSelectedAccountId(parseInt(val))}
            >
              <SelectTrigger data-testid="select-from-account">
                <SelectValue placeholder="Select email account" />
              </SelectTrigger>
              <SelectContent>
                {emailAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.email} {account.isPrimary && "(Primary)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {renderEmailSection("to", "To")}
          {showCc && renderEmailSection("cc", "Cc")}
          {showBcc && renderEmailSection("bcc", "Bcc")}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Message</Label>
            <div className="border rounded-md">
              <div className="flex items-center gap-1 p-2 border-b bg-gray-50 dark:bg-gray-900">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`h-8 w-8 p-0 ${editor?.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  data-testid="btn-bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`h-8 w-8 p-0 ${editor?.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  data-testid="btn-italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`h-8 w-8 p-0 ${editor?.isActive('underline') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  data-testid="btn-underline"
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`h-8 w-8 p-0 ${editor?.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  data-testid="btn-bullet-list"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`h-8 w-8 p-0 ${editor?.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  data-testid="btn-ordered-list"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
              <EditorContent editor={editor} data-testid="editor-body" />
            </div>
            <p className="text-xs text-muted-foreground">
              Report content will be automatically included below your message.
            </p>
          </div>

          {assignedDistro && (
            <p className="text-xs text-muted-foreground">
              Pre-populated from distribution list: <strong>{assignedDistro.name}</strong>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending} data-testid="btn-cancel-email">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} data-testid="btn-send-email">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
