import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, X, Save, Mail, Phone } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
}

interface ContactDetailProps {
  contact: Contact;
  onEdit: () => void;
  onClose: () => void;
}

export function ContactDetail({ contact, onEdit, onClose }: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: contact.email || '',
    phone: contact.phone || '',
    role: contact.role || '',
    notes: contact.notes || '',
    emergencyContactName: contact.emergencyContactName || '',
    emergencyContactPhone: contact.emergencyContactPhone || '',
    emergencyContactEmail: contact.emergencyContactEmail || '',
    emergencyContactRelationship: contact.emergencyContactRelationship || '',
    allergies: contact.allergies || '',
    medicalNotes: contact.medicalNotes || '',
    castTypes: contact.castTypes || [],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/projects/${contact.projectId}/contacts/${contact.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to update contact');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${contact.projectId}/contacts`] });
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCastTypeChange = (castType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      castTypes: checked 
        ? [...prev.castTypes, castType]
        : prev.castTypes.filter(type => type !== castType)
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      role: contact.role || '',
      notes: contact.notes || '',
      emergencyContactName: contact.emergencyContactName || '',
      emergencyContactPhone: contact.emergencyContactPhone || '',
      emergencyContactEmail: contact.emergencyContactEmail || '',
      emergencyContactRelationship: contact.emergencyContactRelationship || '',
      allergies: contact.allergies || '',
      medicalNotes: contact.medicalNotes || '',
      castTypes: contact.castTypes || [],
    });
    setIsEditing(false);
  };

  const ReadOnlyField = ({ label, value, href }: { label: string; value?: string; href?: string }) => {
    if (!value) return null;
    
    return (
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-600">{label}</Label>
        <div className="text-sm text-gray-900">
          {href ? (
            <a href={href} className="text-blue-600 hover:underline">
              {label === "Phone" ? formatPhoneNumber(value) : value}
            </a>
          ) : (
            <span className="whitespace-pre-wrap">{value}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {isEditing ? "Edit Contact" : "Contact Details"}
        </h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="e.g., Actor, Director, Sound Engineer"
                />
              </div>

              {/* Cast Types Section - Only for Cast Category */}
              {contact.category === 'cast' && (
                <div>
                  <Label>Cast Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['principle', 'understudy', 'swing', 'ensemble'].map((castType) => (
                      <div key={castType} className="flex items-center space-x-2">
                        <Checkbox
                          id={castType}
                          checked={formData.castTypes.includes(castType)}
                          onCheckedChange={(checked) => handleCastTypeChange(castType, checked as boolean)}
                        />
                        <Label htmlFor={castType} className="text-sm capitalize">
                          {castType}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="First Name" value={contact.firstName} />
                <ReadOnlyField label="Last Name" value={contact.lastName} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                <ReadOnlyField label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
              </div>
              <ReadOnlyField label="Role" value={contact.role} />
              {contact.category === 'cast' && contact.castTypes && contact.castTypes.length > 0 && (
                <ReadOnlyField label="Cast Type" value={contact.castTypes.join(', ')} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContactName">Name</Label>
                  <Input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Input
                    id="emergencyContactRelationship"
                    name="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={handleInputChange}
                    placeholder="e.g., Spouse, Parent, Friend"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContactPhone">Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContactEmail">Email</Label>
                  <Input
                    id="emergencyContactEmail"
                    name="emergencyContactEmail"
                    type="email"
                    value={formData.emergencyContactEmail}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Name" value={contact.emergencyContactName} />
                <ReadOnlyField label="Relationship" value={contact.emergencyContactRelationship} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Phone" value={contact.emergencyContactPhone} href={contact.emergencyContactPhone ? `tel:${contact.emergencyContactPhone}` : undefined} />
                <ReadOnlyField label="Email" value={contact.emergencyContactEmail} href={contact.emergencyContactEmail ? `mailto:${contact.emergencyContactEmail}` : undefined} />
              </div>
              {(!contact.emergencyContactName && !contact.emergencyContactPhone && !contact.emergencyContactEmail && !contact.emergencyContactRelationship) && (
                <p className="text-sm text-gray-500 italic">No emergency contact information provided</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies & Dietary Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>Allergies & Dietary Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <Label htmlFor="allergies">Allergies & Dietary Restrictions</Label>
                <Textarea
                  id="allergies"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="List any known allergies, dietary restrictions, or food preferences (vegan, gluten-free, kosher, etc.)"
                />
              </div>
              <div>
                <Label htmlFor="medicalNotes">Medical Notes</Label>
                <Textarea
                  id="medicalNotes"
                  name="medicalNotes"
                  value={formData.medicalNotes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any medical conditions, medications, or other health information relevant to the production"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <ReadOnlyField label="Allergies & Dietary Restrictions" value={contact.allergies} />
              <ReadOnlyField label="Medical Notes" value={contact.medicalNotes} />
              {(!contact.allergies && !contact.medicalNotes) && (
                <p className="text-sm text-gray-500 italic">No allergies or medical information provided</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                placeholder="Any additional notes about this contact..."
              />
            </div>
          ) : (
            <>
              <ReadOnlyField label="" value={contact.notes} />
              {!contact.notes && (
                <p className="text-sm text-gray-500 italic">No additional notes provided</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}