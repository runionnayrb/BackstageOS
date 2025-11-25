import { SignatureEditor } from './signature-editor';
import { useQuery } from '@tanstack/react-query';

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
  const { data: signatureData, isLoading } = useQuery<{ signature: string }>({
    queryKey: [`/api/email/accounts/${account?.id}/signature`],
    enabled: !!account?.id,
  });

  if (!account) return null;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading signature...</div>
      ) : (
        <SignatureEditor 
          accountId={account.id} 
          initialSignature={signatureData?.signature || ''} 
        />
      )}
    </div>
  );
}
