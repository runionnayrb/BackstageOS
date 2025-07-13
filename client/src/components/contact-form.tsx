import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    email: contact?.email || "",
    phone: contact?.phone ? formatPhoneNumber(contact.phone) : "",
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/contacts`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Contact created successfully" });
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
      const response = await apiRequest("PATCH", `/api/contacts/${contact?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Contact updated successfully" });
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
    
    // Debug logging to help identify the issue
    console.log("ContactForm category prop:", category);
    console.log("ContactForm formData:", formData);
    
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
      emergencyContactPhone: parsePhoneNumber(formData.emergencyContactPhone),
      category,
      // Only include equity status for cast members
      equityStatus: category === 'cast' ? formData.equityStatus : null,
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
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {contact ? "Edit Contact" : "Add New Contact"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  className={validationErrors.phone ? "border-red-500" : ""}
                />
                {validationErrors.phone && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                )}
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
            {category === 'cast' && (
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

            {/* Equity Status Section - Only for Cast Category */}
            {category === 'cast' && (
              <div>
                <Label>Equity Status</Label>
                <Select value={formData.equityStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, equityStatus: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select equity status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="non-equity">Non-Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
            <div className="grid grid-cols-2 gap-4">
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

        <div className="flex justify-between pt-4">
          <div>
            {contact && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Contact"}
              </Button>
            )}
          </div>
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