import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Palette, Eye, Edit3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

  // Initialize signature content
  useEffect(() => {
    if (initialSignature && signature !== initialSignature) {
      setSignature(initialSignature);
      if (editorRef.current) {
        editorRef.current.innerHTML = initialSignature;
      }
    }
  }, [initialSignature]);

  const updateSignatureMutation = useMutation({
    mutationFn: async (signatureHtml: string) => {
      return apiRequest(`/api/email/accounts/${accountId}/signature`, {
        method: 'PUT',
        body: JSON.stringify({ signature: signatureHtml }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: 'Signature updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts'] });
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

  const handleFontSizeChange = (size: string) => {
    handleFormatCommand('fontSize', size);
  };

  const handleColorChange = (color: string) => {
    handleFormatCommand('foreColor', color);
  };



  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Simple approach - just update the state without messing with cursor position
    setSignature(e.currentTarget.innerHTML);
  };

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc',
    '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#800000', '#008000', '#000080',
    '#808000', '#800080', '#008080', '#c0c0c0', '#808080'
  ];

  return (
    <div className="w-full space-y-3">
        {/* Simple controls row */}
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
          >
            {updateSignatureMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Minimal formatting toolbar */}
        <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFormatCommand('bold')}
            className="p-1 h-7 w-7 hover:bg-gray-200"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFormatCommand('italic')}
            className="p-1 h-7 w-7 hover:bg-gray-200"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFormatCommand('underline')}
            className="p-1 h-7 w-7 hover:bg-gray-200"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Signature input */}
        <div
          ref={editorRef}
          contentEditable
          className="min-h-24 rounded-lg p-3 bg-white border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          onInput={handleEditorInput}
          style={{ 
            minHeight: '96px',
            fontSize: '16px', // Prevents zoom on iOS
            lineHeight: '1.4'
          }}
          suppressContentEditableWarning={true}
          placeholder="Enter your email signature..."
        />

        <div className="text-xs text-gray-500">
          Keep it professional and include your name, title, and contact information.
        </div>
    </div>
  );
}