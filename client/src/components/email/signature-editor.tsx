import { useState, useEffect } from 'react';
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSignature(initialSignature);
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
    document.execCommand(command, false, value);
    const editor = document.getElementById('signature-editor');
    if (editor) {
      setSignature(editor.innerHTML);
    }
  };

  const handleFontSizeChange = (size: string) => {
    handleFormatCommand('fontSize', size);
  };

  const handleColorChange = (color: string) => {
    handleFormatCommand('foreColor', color);
  };

  const handleSave = () => {
    updateSignatureMutation.mutate(signature);
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    setSignature(e.currentTarget.innerHTML);
  };

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc',
    '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#800000', '#008000', '#000080',
    '#808000', '#800080', '#008080', '#c0c0c0', '#808080'
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Email Signature
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSignatureMutation.isPending}
              size="sm"
            >
              {updateSignatureMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPreviewMode && (
          <div className="border rounded-lg p-2 bg-gray-50">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Text formatting */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormatCommand('bold')}
                  className="p-1 h-8 w-8"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormatCommand('italic')}
                  className="p-1 h-8 w-8"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormatCommand('underline')}
                  className="p-1 h-8 w-8"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Alignment */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormatCommand('justifyLeft')}
                  className="p-1 h-8 w-8"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormatCommand('justifyCenter')}
                  className="p-1 h-8 w-8"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormatCommand('justifyRight')}
                  className="p-1 h-8 w-8"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Font size */}
              <Select onValueChange={handleFontSizeChange}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Small</SelectItem>
                  <SelectItem value="2">Normal</SelectItem>
                  <SelectItem value="3">Medium</SelectItem>
                  <SelectItem value="4">Large</SelectItem>
                  <SelectItem value="5">Larger</SelectItem>
                </SelectContent>
              </Select>

              {/* Text color */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="grid grid-cols-5 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border border-gray-300 hover:border-gray-500"
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorChange(color)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="signature-editor">Signature</Label>
          {isPreviewMode ? (
            <div className="min-h-32 border rounded-lg p-4 bg-white">
              <div dangerouslySetInnerHTML={{ __html: signature }} />
            </div>
          ) : (
            <div
              id="signature-editor"
              contentEditable
              className="min-h-32 border rounded-lg p-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              dangerouslySetInnerHTML={{ __html: signature }}
              onInput={handleEditorInput}
              style={{ minHeight: '128px' }}
            />
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p>Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use formatting tools to style your signature</li>
            <li>Keep it professional and concise</li>
            <li>Include your name, title, and contact information</li>
            <li>This signature will be added to all emails sent from this account</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}