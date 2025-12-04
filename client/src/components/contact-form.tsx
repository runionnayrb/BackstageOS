import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPhoneByCountry, extractCountryFromPhone, formatWhatsAppWithCountry } from "@/utils/countryCodes";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  category: string;
  groupId?: number;
  role?: string;
  notes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  emergencyContactRelationship?: string;
  allergies?: string;
  medicalNotes?: string;
  castTypes?: string[];
  equityStatus?: string;
}

interface ContactFormProps {
  projectId: string;
  category: string;
  contact?: Contact | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Phone number formatting functions
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '');
  
  // Apply formatting based on length
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

const parsePhoneNumber = (formatted: string): string => {
  // Remove formatting and return just digits
  return formatted.replace(/\D/g, '');
};

const validatePhoneNumber = (phone: string): string | null => {
  if (!phone.trim()) return null; // Optional field
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return "Phone number must be at least 10 digits";
  if (digits.length > 11) return "Phone number cannot exceed 11 digits";
  if (digits.length === 11 && !digits.startsWith('1')) return "11-digit numbers must start with 1";
  return null;
};

export function ContactForm({ projectId, category, contact, onClose, onSuccess }: ContactFormProps) {
  console.log('ContactForm Debug:', {
    contact,
    hasContact: !!contact,
    contactId: contact?.id,
    isEditing: !!contact?.id
  });
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    preferredName: contact?.preferredName || "",
    email: contact?.email || "",
    phone: contact?.phone ? formatPhoneNumber(contact.phone) : "",
    whatsapp: contact?.whatsapp ? formatPhoneNumber(contact.whatsapp) : "",
    groupId: contact?.groupId || "",
    role: contact?.role || "",
    notes: contact?.notes || "",
    emergencyContactName: contact?.emergencyContactName || "",
    emergencyContactPhone: contact?.emergencyContactPhone ? formatPhoneNumber(contact.emergencyContactPhone) : "",
    emergencyContactEmail: contact?.emergencyContactEmail || "",
    emergencyContactRelationship: contact?.emergencyContactRelationship || "",
    allergies: contact?.allergies || "",
    medicalNotes: contact?.medicalNotes || "",
    castTypes: contact?.castTypes || [],
    equityStatus: contact?.equityStatus || "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query contact groups for determining if selected group is "Cast"
  const { data: contactGroups = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/contact-groups`],
  });
  
  // Helper to check if the selected group is "Cast"
  const isSelectedGroupCast = () => {
    if (!formData.groupId) return false;
    const selectedGroup = contactGroups.find((g: any) => g.id === parseInt(formData.groupId.toString()));
    return selectedGroup?.name === 'Cast';
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/projects/${projectId}/contacts`, data);
    },
    onSuccess: () => {
      toast({ title: "Contact created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'contacts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/contacts/${contact?.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Contact updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'contacts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contacts/${contact?.id}`);
    },
    onSuccess: () => {
      toast({ title: "Contact deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'contacts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone numbers
    const errors: Record<string, string> = {};
    
    const phoneError = validatePhoneNumber(formData.phone);
    if (phoneError) errors.phone = phoneError;
    
    const emergencyPhoneError = validatePhoneNumber(formData.emergencyContactPhone);
    if (emergencyPhoneError) errors.emergencyContactPhone = emergencyPhoneError;
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors on successful validation
    setValidationErrors({});
    
    const data = {
      ...formData,
      // Store unformatted phone numbers in database
      phone: parsePhoneNumber(formData.phone),
      // For WhatsApp, store as-is (already formatted with country code)
      whatsapp: formData.whatsapp,
      emergencyContactPhone: parsePhoneNumber(formData.emergencyContactPhone),
      groupId: formData.groupId ? parseInt(formData.groupId) : null,
      // Only include equity status for cast members (contacts in "Cast" group)
      equityStatus: isSelectedGroupCast() ? formData.equityStatus : null,
    };
    
    console.log("ContactForm submission data:", data);

    if (contact) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (contact && window.confirm("Are you sure you want to delete this contact?")) {
      deleteMutation.mutate();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone' || name === 'emergencyContactPhone') {
      // Format phone number as user types
      setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else if (name === 'whatsapp') {
      // Format WhatsApp with auto-detected country code
      setFormData(prev => ({ ...prev, [name]: formatWhatsAppWithCountry(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const ContactGroupSelect = () => {
    const { data: contactGroups = [] } = useQuery({
      queryKey: [`/api/projects/${projectId}/contact-groups`],
    });
    
    return (
      <>
        {contactGroups.map((group) => (
          <SelectItem key={group.id} value={group.id.toString()}>
            {group.name}
          </SelectItem>
        ))}
      </>
    );
  };

  const handleCastTypeChange = (castType: string, checked: boolean) => {
    setFormData(prev => {
      const newCastTypes = checked 
        ? [...prev.castTypes, castType]
        : prev.castTypes.filter(type => type !== castType);
      
      // If selecting "principle", remove all other types
      if (castType === 'principle' && checked) {
        return { ...prev, castTypes: ['principle'] };
      }
      
      // If selecting any other type while "principle" is selected, remove "principle"
      if (castType !== 'principle' && checked && prev.castTypes.includes('principle')) {
        return { ...prev, castTypes: [castType] };
      }
      
      return { ...prev, castTypes: newCastTypes };
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" data-grid-layout="custom-widths">
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
              <div>
                <Label htmlFor="preferredName">Preferred Name</Label>
                <Input
                  id="preferredName"
                  name="preferredName"
                  value={formData.preferredName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="phone">Mobile</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(xxx) xxx-xxxx"
                  className={validationErrors.phone ? "border-red-500" : ""}
                />
                {validationErrors.phone && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                )}
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="+1 (xxx) xxx-xxxx"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="groupId">Contact Group</Label>
                <Select value={formData.groupId?.toString() || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ContactGroupSelect projectId={projectId} />
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes about this contact..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContactName">Name</Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  placeholder="Full name"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContactPhone">Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={handleInputChange}
                  placeholder="(xxx) xxx-xxxx"
                  className={validationErrors.emergencyContactPhone ? "border-red-500" : ""}
                />
                {validationErrors.emergencyContactPhone && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.emergencyContactPhone}</p>
                )}
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
          </CardContent>
        </Card>

        {/* Allergies & Medical Section */}
        <Card>
          <CardHeader>
            <CardTitle>Allergies & Dietary Restrictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          {/* Delete button on the left - only show when editing existing contact */}
          <div>
            {contact && contact.id ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Contact"}
              </Button>
            ) : (
              <div className="text-sm text-gray-500">
                {/* Empty div to maintain layout */}
              </div>
            )}
          </div>
          
          {/* Save/Cancel buttons on the right */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : contact
                ? "Update Contact"
                : "Add Contact"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}