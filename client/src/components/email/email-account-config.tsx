import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, User, FileText } from 'lucide-react';
import { SignatureEditor } from './signature-editor';

interface EmailAccountConfigProps {
  account?: {
    id: number;
    emailAddress: string;
    displayName: string;
    accountType: string;
    isDefault: boolean;
    isActive: boolean;
  };
  onClose?: () => void;
}

export function EmailAccountConfig({ account, onClose }: EmailAccountConfigProps) {
  if (!account) return null;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex items-center justify-center gap-2 flex-1">
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="signature" className="flex items-center justify-center gap-2 flex-1">
            <FileText className="h-4 w-4" />
            Signature
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Basic account settings and information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Email Address</Label>
                <Input
                  id="emailAddress"
                  value={account.emailAddress}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Email addresses cannot be changed after creation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={account.displayName}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Use the Settings button in the sidebar to edit your display name
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Input
                  id="accountType"
                  value={account.accountType === 'personal' ? 'Personal' : 'Team'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature" className="space-y-4">
          <SignatureEditor accountId={account.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}