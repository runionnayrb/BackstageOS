import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact.firstName} {contact.lastName}
          </DialogTitle>
        </DialogHeader>
        <ContactDetail
          contact={contact}
          onEdit={() => onEdit(contact)}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}