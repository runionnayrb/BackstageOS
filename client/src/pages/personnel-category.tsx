import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ContactForm } from "@/components/contact-form";
import { ContactDetail } from "@/components/contact-detail";

interface PersonnelCategoryParams {
  id: string;
  category: string;
}

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

export default function PersonnelCategory() {
  const [, setLocation] = useLocation();
  const params = useParams<PersonnelCategoryParams>();
  const projectId = params.id;
  const category = params.category;
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Filter contacts by category
  const categoryContacts = contacts.filter((contact: Contact) => contact.category === category);

  // Get category display name
  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'cast': return 'Cast';
      case 'crew': return 'Crew';
      case 'stage_management': return 'Stage Management';
      case 'creative_team': return 'Creative Team';
      case 'theater_staff': return 'Theater Staff';
      default: return cat;
    }
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setShowForm(false);
    setEditingContact(null);
  };

  const handleAddContact = () => {
    setShowForm(true);
    setSelectedContact(null);
    setEditingContact(null);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
    setSelectedContact(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingContact(null);
    setSelectedContact(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/shows/${projectId}/contacts`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </Button>
          <Button onClick={handleAddContact} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact List */}
          <div className="space-y-4">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">{getCategoryTitle(category)}</h1>
              <p className="text-gray-500 mt-2">
                {categoryContacts.length} contact{categoryContacts.length !== 1 ? 's' : ''}
              </p>
            </div>

            {categoryContacts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No contacts in this category yet</p>
                <Button onClick={handleAddContact} variant="outline">
                  Add First Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {categoryContacts.map((contact: Contact) => (
                  <div
                    key={contact.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleContactClick(contact)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        {contact.role && (
                          <p className="text-sm text-gray-600">{contact.role}</p>
                        )}
                        {category === 'cast' && (
                          <p className="text-xs text-gray-500">
                            {(() => {
                              console.log('Personnel category cast types debug:', contact.castTypes, typeof contact.castTypes);
                              if (contact.castTypes && contact.castTypes.length > 0) {
                                return contact.castTypes.join(', ').replace(/^./, (char: string) => char.toUpperCase());
                              }
                              return 'No Cast Assigned';
                            })()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditContact(contact);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail/Form Panel */}
          <div className="lg:col-span-2 lg:border-l lg:pl-6">
            {showForm ? (
              <ContactForm
                projectId={projectId}
                category={category}
                contact={editingContact}
                onClose={handleFormClose}
                onSuccess={() => {
                  handleFormClose();
                  queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
                }}
              />
            ) : selectedContact ? (
              <ContactDetail
                contact={selectedContact}
                onEdit={() => handleEditContact(selectedContact)}
                onClose={() => setSelectedContact(null)}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Select a contact to view details or add a new contact</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}