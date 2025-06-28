import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, X, Mail, Phone, FileText } from "lucide-react";

// Phone number formatting function
const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '');
  
  // Apply formatting based on length
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  category: string;
  role?: string;
  notes?: string;
  emergencyContact?: string;
}

interface ContactDetailProps {
  contact: Contact;
  onEdit: () => void;
  onClose: () => void;
}

export function ContactDetail({ contact, onEdit, onClose }: ContactDetailProps) {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contact Details</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {contact.firstName} {contact.lastName}
          </CardTitle>
          {contact.role && (
            <p className="text-sm text-gray-600">{contact.role}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Email:</span>
              <a 
                href={`mailto:${contact.email}`} 
                className="text-blue-600 hover:underline"
              >
                {contact.email}
              </a>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Phone:</span>
              <a 
                href={`tel:${contact.phone}`} 
                className="text-blue-600 hover:underline"
              >
                {formatPhoneNumber(contact.phone)}
              </a>
            </div>
          )}

          {contact.emergencyContact && (
            <div className="flex items-start gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
              <span className="font-medium">Emergency Contact:</span>
              <a 
                href={`tel:${contact.emergencyContact}`} 
                className="text-blue-600 hover:underline"
              >
                {formatPhoneNumber(contact.emergencyContact)}
              </a>
            </div>
          )}

          {contact.notes && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
              <span className="font-medium">Notes:</span>
              <span className="whitespace-pre-wrap">{contact.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}