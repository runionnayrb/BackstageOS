import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bold, Italic, Underline, Link, Mail, Phone, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SignatureEditorProps {
  accountId: number;
  initialSignature?: string;
}

export function SignatureEditor({ accountId, initialSignature = '' }: SignatureEditorProps) {
  const [signature, setSignature] = useState(initialSignature);
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailDisplayText, setEmailDisplayText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneDisplayText, setPhoneDisplayText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialSignature) {
      setSignature(initialSignature);
      if (editorRef.current) {
        editorRef.current.innerHTML = initialSignature;
      }
    }
  }, [initialSignature]);

  const updateSignatureMutation = useMutation({
    mutationFn: async (signatureHtml: string) => {
      return apiRequest('PUT', `/api/email/accounts/${accountId}/signature`, { signature: signatureHtml });
    },
    onSuccess: () => {
      toast({ title: 'Signature updated successfully' });
      queryClient.invalidateQueries({ queryKey: [`/api/email/accounts/${accountId}/signature`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update signature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFormatCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setSignature(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    setSignature(e.currentTarget.innerHTML);
  };

  const insertHtmlAtCursor = (html: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, html);
      setSignature(editorRef.current.innerHTML);
    }
  };

  const handleInsertLink = () => {
    if (!linkUrl) return;
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    const text = linkText || url;
    const html = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">${text}</a>`;
    insertHtmlAtCursor(html);
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleInsertEmail = () => {
    if (!emailAddress) return;
    const text = emailDisplayText || emailAddress;
    const html = `<a href="mailto:${emailAddress}" style="color: #0066cc; text-decoration: underline;">${text}</a>`;
    insertHtmlAtCursor(html);
    setShowEmailDialog(false);
    setEmailAddress('');
    setEmailDisplayText('');
  };

  const handleInsertPhone = () => {
    if (!phoneNumber) return;
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    const text = phoneDisplayText || phoneNumber;
    const html = `<a href="tel:${cleanNumber}" style="color: #0066cc; text-decoration: underline;">${text}</a>`;
    insertHtmlAtCursor(html);
    setShowPhoneDialog(false);
    setPhoneNumber('');
    setPhoneDisplayText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({
          title: 'Image too large',
          description: 'Please select an image smaller than 500KB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      setImageUrl('');
    }
  };

  const handleInsertImage = () => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const html = `<img src="${base64}" alt="Signature image" style="max-width: 200px; max-height: 80px; width: auto; height: auto;" />`;
        insertHtmlAtCursor(html);
        setShowImageDialog(false);
        setImageFile(null);
        setImageUrl('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(imageFile);
    } else if (imageUrl) {
      const html = `<img src="${imageUrl}" alt="Signature image" style="max-width: 200px; max-height: 80px; width: auto; height: auto;" />`;
      insertHtmlAtCursor(html);
      setShowImageDialog(false);
      setImageUrl('');
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Email Signature</div>
        <Button
          onClick={() => {
            if (editorRef.current) {
              setSignature(editorRef.current.innerHTML);
              updateSignatureMutation.mutate(editorRef.current.innerHTML);
            }
          }}
          disabled={updateSignatureMutation.isPending}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="button-save-signature"
        >
          {updateSignatureMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormatCommand('bold')}
          className="p-1 h-7 w-7 hover:bg-gray-200"
          title="Bold"
          data-testid="button-format-bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormatCommand('italic')}
          className="p-1 h-7 w-7 hover:bg-gray-200"
          title="Italic"
          data-testid="button-format-italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormatCommand('underline')}
          className="p-1 h-7 w-7 hover:bg-gray-200"
          title="Underline"
          data-testid="button-format-underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLinkDialog(true)}
          className="p-1 h-7 w-7 hover:bg-gray-200"
          title="Insert Link"
          data-testid="button-insert-link"
        >
          <Link className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowEmailDialog(true)}
          className="p-1 h-7 w-7 hover:bg-gray-200"
          title="Insert Email"
          data-testid="button-insert-email"
        >
          <Mail className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPhoneDialog(true)}
          className="p-1 h-7 w-7 hover:bg-gray-200"
          title="Insert Phone"
          data-testid="button-insert-phone"
        >
          <Phone className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowImageDialog(true)}
          className="p-1 h-7 w-7 hover:bg-gray-200"
          title="Insert Image"
          data-testid="button-insert-image"
        >
          <Image className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        className="min-h-24 rounded-lg p-3 bg-white border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
        onInput={handleEditorInput}
        style={{ 
          minHeight: '96px',
          fontSize: '16px',
          lineHeight: '1.4'
        }}
        suppressContentEditableWarning={true}
        data-testid="input-signature-editor"
      />

      <div className="text-xs text-gray-500">
        Add links, email addresses, phone numbers, and images to make your signature interactive.
      </div>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                data-testid="input-link-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-text">Display Text (optional)</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                data-testid="input-link-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
            <Button onClick={handleInsertLink} disabled={!linkUrl} data-testid="button-confirm-link">Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Insert Email Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="name@example.com"
                data-testid="input-email-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-text">Display Text (optional)</Label>
              <Input
                id="email-text"
                value={emailDisplayText}
                onChange={(e) => setEmailDisplayText(e.target.value)}
                placeholder="Email me"
                data-testid="input-email-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={handleInsertEmail} disabled={!emailAddress} data-testid="button-confirm-email">Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Insert Phone Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                data-testid="input-phone-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-text">Display Text (optional)</Label>
              <Input
                id="phone-text"
                value={phoneDisplayText}
                onChange={(e) => setPhoneDisplayText(e.target.value)}
                placeholder="Call me"
                data-testid="input-phone-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)}>Cancel</Button>
            <Button onClick={handleInsertPhone} disabled={!phoneNumber} data-testid="button-confirm-phone">Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Upload Image</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
                data-testid="input-image-file"
              />
              <p className="text-xs text-gray-500">Max size: 500KB. Image will be auto-sized to fit signature.</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                placeholder="https://example.com/logo.png"
                data-testid="input-image-url"
              />
            </div>
            {imageFile && (
              <div className="text-sm text-green-600">
                Selected: {imageFile.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImageDialog(false);
              setImageFile(null);
              setImageUrl('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}>Cancel</Button>
            <Button onClick={handleInsertImage} disabled={!imageFile && !imageUrl} data-testid="button-confirm-image">Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
