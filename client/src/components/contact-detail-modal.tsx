import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ContactDetail } from "@/components/contact-detail";

interface Contact {
  id: number;
  projectId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  category: string;
  role?: string;
  notes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  emergencyContactRelationship?: string;
  allergies?: string;
  medicalNotes?: string;
  castTypes?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface ContactDetailModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
}

export function ContactDetailModal({ contact, isOpen, onClose, onEdit }: ContactDetailModalProps) {
  if (!contact) return null;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <ContactDetail
          contact={contact}
          onEdit={() => onEdit(contact)}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}