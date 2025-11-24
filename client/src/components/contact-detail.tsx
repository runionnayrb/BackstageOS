import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, X, Save, Mail, Phone, Camera, Upload, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WeeklyAvailabilityEditor } from "@/components/weekly-availability-editor";

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
  preferredName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  category: string;
  groupId?: number;
  role?: string;
  notes?: string;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  emergencyContactRelationship?: string;
  allergies?: string;
  medicalNotes?: string;
  castTypes?: string[];
  equityStatus?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface ContactDetailProps {
  contact: Contact;
  onEdit: () => void;
  onClose: () => void;
}

export function ContactDetail({ contact, onEdit, onClose }: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    preferredName: contact.preferredName || '',
    email: contact.email || '',
    phone: contact.phone || '',
    whatsapp: contact.whatsapp || '',
    groupId: contact.groupId || '',
    role: contact.role || '',
    notes: contact.notes || '',
    emergencyContactName: contact.emergencyContactName || '',
    emergencyContactPhone: contact.emergencyContactPhone || '',
    emergencyContactEmail: contact.emergencyContactEmail || '',
    emergencyContactRelationship: contact.emergencyContactRelationship || '',
    allergies: contact.allergies || '',
    medicalNotes: contact.medicalNotes || '',
    castTypes: contact.castTypes || [],
    equityStatus: contact.equityStatus || '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PUT', `/api/projects/${contact.projectId}/contacts/${contact.id}`, data);
    },
    onSuccess: (updatedContact) => {
      // Update the contact in the parent component
      Object.assign(contact, updatedContact);
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

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/contacts/${contact.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${contact.projectId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      onClose(); // Close the modal after deletion
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
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

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      deleteMutation.mutate();
    }
  };

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      return apiRequest('POST', `/api/projects/${contact.projectId}/contacts/${contact.id}/photo`, formData);
    },
    onSuccess: (data) => {
      // Update the contact object
      contact.photoUrl = data.url;
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${contact.projectId}/contacts`] });
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
      setIsUploadingPhoto(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
      setIsUploadingPhoto(false);
    },
  });

  // Photo delete mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/projects/${contact.projectId}/contacts/${contact.id}/photo`);
    },
    onSuccess: () => {
      // Update the contact object
      contact.photoUrl = undefined;
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${contact.projectId}/contacts`] });
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setIsUploadingPhoto(true);
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleDeletePhoto = () => {
    deletePhotoMutation.mutate();
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setFormData({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      preferredName: contact.preferredName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      groupId: contact.groupId || '',
      role: contact.role || '',
      notes: contact.notes || '',
      emergencyContactName: contact.emergencyContactName || '',
      emergencyContactPhone: contact.emergencyContactPhone || '',
      emergencyContactEmail: contact.emergencyContactEmail || '',
      emergencyContactRelationship: contact.emergencyContactRelationship || '',
      allergies: contact.allergies || '',
      medicalNotes: contact.medicalNotes || '',
      castTypes: contact.castTypes || [],
      equityStatus: contact.equityStatus || '',
    });
    setIsEditing(false);
  };

  const ContactGroupSelect = ({ projectId }: { projectId: number }) => {
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
        <div>
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Contact" : "Contact Details"}
          </h2>
          {contact.updatedAt && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(contact.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
              <button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Photo Management */}
      {(contact.photoUrl || isEditing) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Photo</h3>
          <div className="flex items-start gap-4">
            {/* Photo Display */}
            <div className="flex-shrink-0">
              {contact.photoUrl ? (
                <div className="relative">
                  <img
                    src={contact.photoUrl}
                    alt={`${contact.firstName} ${contact.lastName}`}
                    className="w-24 h-24 rounded-lg object-cover border"
                  />
                  {isEditing && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleDeletePhoto}
                      disabled={deletePhotoMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : isEditing ? (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
              ) : null}
            </div>
            
            {/* Photo Controls - Only show in edit mode */}
            {isEditing && (
              <div className="flex-grow space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerPhotoUpload}
                  disabled={isUploadingPhoto || uploadPhotoMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingPhoto || uploadPhotoMutation.isPending ? "Optimizing..." : contact.photoUrl ? "Replace Photo" : "Add Photo"}
                </Button>
                
                {contact.photoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeletePhoto}
                    disabled={deletePhotoMutation.isPending}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletePhotoMutation.isPending ? "Removing..." : "Remove Photo"}
                  </Button>
                )}
                
                <p className="text-xs text-gray-500">
                  JPG, PNG, or GIF up to 5MB<br />
                  Images are automatically optimized to WebP format (300×300px)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact Information</h3>
        <div className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label htmlFor="phone">Mobile</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Select value={formData.groupId?.toString() || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value ? parseInt(value) : '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contact.projectId && <ContactGroupSelect projectId={contact.projectId} />}
                    </SelectContent>
                  </Select>
                </div>
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

              {/* Equity Status Section - Only for Cast Category */}
              {contact.category === 'cast' && (
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
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <ReadOnlyField label="First Name" value={contact.firstName} />
                <ReadOnlyField label="Last Name" value={contact.lastName} />
                <ReadOnlyField label="Preferred Name" value={contact.preferredName} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <ReadOnlyField label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                <ReadOnlyField label="Mobile" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
                <ReadOnlyField label="WhatsApp" value={contact.whatsapp} href={contact.whatsapp ? `tel:${contact.whatsapp}` : undefined} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <ReadOnlyField label="Contact Group" value={contact.groupId ? 'Assigned' : 'Not assigned'} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <ReadOnlyField label="Role" value={contact.role} />
              </div>
              {contact.category === 'cast' && (
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField 
                    label="Cast Type" 
                    value={contact.castTypes && contact.castTypes.length > 0 
                      ? contact.castTypes.join(', ').replace(/^./, (char: string) => char.toUpperCase())
                      : 'No Cast Assigned'
                    } 
                  />
                </div>
              )}
              {contact.category === 'cast' && (
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField 
                    label="Equity Status" 
                    value={contact.equityStatus 
                      ? contact.equityStatus.charAt(0).toUpperCase() + contact.equityStatus.slice(1).replace('-', '-')
                      : 'Not specified'
                    } 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Emergency Contact</h3>
        <div className="space-y-4">
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
        </div>
      </div>

      {/* Allergies & Dietary Restrictions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Allergies & Dietary Restrictions</h3>
        <div className="space-y-4">
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
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Availability</h3>
          <WeeklyAvailabilityEditor contact={contact} />
        </div>
        <p className="text-sm text-gray-500">
          Manage this contact's availability for scheduling and calendar coordination.
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notes</h3>
        <div>
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
        </div>
      </div>

      {/* Delete Contact Button - Only show when editing */}
      {isEditing && (
        <div className="pt-6 border-t">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Contact"}
          </Button>
        </div>
      )}
    </div>
  );
}