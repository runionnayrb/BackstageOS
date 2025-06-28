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
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  emergencyContactRelationship?: string;
  allergies?: string;
  medicalNotes?: string;
  castTypes?: string[];
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
        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Contact Information</h4>
            
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

            {contact.category === 'cast' && contact.castTypes && contact.castTypes.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <span className="font-medium">Cast Type:</span>
                <span className="capitalize">{contact.castTypes.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          {(contact.emergencyContactName || contact.emergencyContactPhone || contact.emergencyContactEmail) && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">Emergency Contact</h4>
              
              {contact.emergencyContactName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Name:</span>
                  <span>{contact.emergencyContactName}</span>
                  {contact.emergencyContactRelationship && (
                    <span className="text-gray-500">({contact.emergencyContactRelationship})</span>
                  )}
                </div>
              )}

              {contact.emergencyContactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Phone:</span>
                  <a 
                    href={`tel:${contact.emergencyContactPhone}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {formatPhoneNumber(contact.emergencyContactPhone)}
                  </a>
                </div>
              )}

              {contact.emergencyContactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Email:</span>
                  <a 
                    href={`mailto:${contact.emergencyContactEmail}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {contact.emergencyContactEmail}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Allergies & Medical */}
          {(contact.allergies || contact.medicalNotes) && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">Allergies & Dietary Restrictions</h4>
              
              {contact.allergies && (
                <div className="text-sm">
                  <span className="font-medium">Allergies & Dietary Restrictions:</span>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{contact.allergies}</p>
                </div>
              )}

              {contact.medicalNotes && (
                <div className="text-sm">
                  <span className="font-medium">Medical Notes:</span>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{contact.medicalNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}