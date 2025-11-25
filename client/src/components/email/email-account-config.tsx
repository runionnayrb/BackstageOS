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
      <SignatureEditor accountId={account.id} />
    </div>
  );
}
