import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, FileText, ChevronDown, Mail, Phone, GripVertical, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ContactDetailModal } from "@/components/contact-detail-modal";
import { WeeklyAvailabilityEditor } from "@/components/weekly-availability-editor";
import { ContactForm } from "@/components/contact-form";
import QuickSectionSwitcher from "@/components/navigation/quick-section-switcher";

interface PersonnelParams {
  id: string;
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
}

export default function Personnel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PersonnelParams>();
  const projectId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Guard against missing projectId
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Personnel Not Found</h1>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist or the URL is invalid.</p>
          <Button onClick={() => setLocation('/shows')}>
            Go to Shows
          </Button>
        </div>
      </div>
    );
  }

  // Order categories as requested: creative team, stage management, cast, crew, theatre staff
  const defaultCategories = [
    { id: "creative_team", title: "Creative Team" },
    { id: "stage_management", title: "Stage Management" },
    { id: "cast", title: "Cast" },
    { id: "crew", title: "Crew" },
    { id: "theater_staff", title: "Theater Staff" },
  ];

  const [categories, setCategories] = useState(defaultCategories);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [availabilityContact, setAvailabilityContact] = useState<Contact | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Load saved category order from project settings
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  // Query all contacts
  const { data: allContacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
    enabled: !!projectId,
  });

  // Apply saved category order when project settings load
  useEffect(() => {
    if (projectSettings && typeof projectSettings === 'object' && 'contactCategoriesOrder' in projectSettings && projectSettings.contactCategoriesOrder) {
      const savedOrder = projectSettings.contactCategoriesOrder as string[];
      const reorderedCategories = savedOrder.map((id: string) => 
        defaultCategories.find(cat => cat.id === id)
      ).filter((cat): cat is typeof defaultCategories[0] => cat !== undefined);
      
      // Add any new categories that weren't in the saved order
      const savedIds = new Set(savedOrder);
      const newCategories = defaultCategories.filter(cat => !savedIds.has(cat.id));
      
      setCategories([...reorderedCategories, ...newCategories]);
    }
  }, [projectSettings]);

  // Save category order mutation
  const saveCategoryOrderMutation = useMutation({
    mutationFn: async (categoryOrder: string[]) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/settings`, {
        contactCategoriesOrder: categoryOrder
      });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save category order",
        variant: "destructive",
      });
    },
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newCategories = [...categories];
    const draggedCategory = newCategories[draggedIndex];
    
    // Remove dragged item
    newCategories.splice(draggedIndex, 1);
    
    // Insert at new position
    newCategories.splice(dropIndex, 0, draggedCategory);
    
    setCategories(newCategories);
    setDraggedIndex(null);
    
    // Save the new order
    const categoryOrder = newCategories.map(cat => cat.id);
    saveCategoryOrderMutation.mutate(categoryOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Group contacts by category using current category order
  const contactsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = allContacts.filter(contact => contact.category === category.id);
    return acc;
  }, {} as Record<string, Contact[]>);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactModal(true);
  };

  const handleContactModalClose = () => {
    setShowContactModal(false);
    setSelectedContact(null);
  };

  const handleEditContact = (contact: Contact) => {
    // Navigate to the category page for editing
    setLocation(`/shows/${projectId}/contacts/${contact.category}`);
  };

  const handleAvailabilityClick = (contact: Contact) => {
    setAvailabilityContact(contact);
    setShowAvailabilityModal(true);
  };

  const handleAvailabilityModalClose = () => {
    setShowAvailabilityModal(false);
    setAvailabilityContact(null);
  };

  const handleNewContactClick = () => {
    setShowNewContactModal(true);
  };

  const handleNewContactModalClose = () => {
    setShowNewContactModal(false);
  };

  const handleNewContactSuccess = () => {
    setShowNewContactModal(false);
    // Refresh the contacts list
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
  };

  const handleEmailContact = (email: string) => {
    setLocation(`/shows/${projectId}/compose?to=${encodeURIComponent(email)}`);
  };

  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return '';
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as (xxx) xxx-xxxx
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // Return original if not 10 digits
    return phone;
  };



  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Header */}
      <div className="md:hidden px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div></div>
          
          <div className="flex items-center gap-2">
            {allContacts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${projectId}/contact-sheet`)}>
                    Contact Sheet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${projectId}/company-list`)}>
                    Company List
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant={isReordering ? "default" : "ghost"}
              onClick={() => setIsReordering(!isReordering)}
              size="sm"
              className="flex items-center gap-1"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewContactClick}
            className="hover:bg-transparent hover:text-blue-600 transition-colors p-1"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div></div>
          
          <div className="flex items-center gap-3">
            {allContacts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Create
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${projectId}/contact-sheet`)}>
                    Contact Sheet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation(`/shows/${projectId}/company-list`)}>
                    Company List
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant={isReordering ? "default" : "ghost"}
              onClick={() => setIsReordering(!isReordering)}
              className="flex items-center gap-2"
            >
              <GripVertical className="h-4 w-4" />
              {isReordering ? "Done Reordering" : "Reorder"}
            </Button>
          </div>
        </div>
        
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewContactClick}
            className="hover:bg-transparent hover:text-blue-600 transition-colors p-1"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Contact List */}
      <div className="md:hidden px-4">
        <div className="space-y-6">
          {categories.map((category, categoryIndex) => {
            const categoryContacts = contactsByCategory[category.id] || [];
            
            return (
              <div
                key={category.id}
                draggable={isReordering}
                onDragStart={isReordering ? (e) => handleDragStart(e, categoryIndex) : undefined}
                onDragOver={isReordering ? handleDragOver : undefined}
                onDrop={isReordering ? (e) => handleDrop(e, categoryIndex) : undefined}
                onDragEnd={isReordering ? handleDragEnd : undefined}
                className={`${
                  isReordering && draggedIndex === categoryIndex 
                    ? 'opacity-50 bg-blue-50 border-blue-200 border-2 rounded-lg p-3' 
                    : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {isReordering && (
                    <div className="drag-handle cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">{category.title}</h2>
                  <span className="text-gray-500 text-sm">({categoryContacts.length})</span>
                </div>
                
                {categoryContacts.length === 0 ? (
                  <div className="text-gray-500 italic py-3 px-2 text-sm">
                    No contacts in this category yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleContactClick(contact)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </h3>
                            {contact.role && (
                              <p className="text-sm text-gray-600 mt-0.5">{contact.role}</p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Calendar 
                              className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAvailabilityClick(contact);
                              }}
                            />
                            {contact.email && (
                              <Mail 
                                className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmailContact(contact.email!);
                                }}
                              />
                            )}
                            {contact.phone && (
                              <Phone 
                                className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${contact.phone}`;
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {contact.email && (
                            <p className="text-sm text-gray-600 truncate">{contact.email}</p>
                          )}
                          {contact.phone && (
                            <p className="text-sm text-gray-600">{formatPhoneNumber(contact.phone)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Contact List */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {categories.map((category, categoryIndex) => {
            const categoryContacts = contactsByCategory[category.id] || [];
            
            return (
              <div
                key={category.id}
                draggable={isReordering}
                onDragStart={isReordering ? (e) => handleDragStart(e, categoryIndex) : undefined}
                onDragOver={isReordering ? handleDragOver : undefined}
                onDrop={isReordering ? (e) => handleDrop(e, categoryIndex) : undefined}
                onDragEnd={isReordering ? handleDragEnd : undefined}
                className={`${
                  isReordering && draggedIndex === categoryIndex 
                    ? 'opacity-50 bg-blue-50 border-blue-200 border-2 rounded-lg p-4' 
                    : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {isReordering && (
                    <div className="drag-handle cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
                  <span className="text-gray-500 text-sm">({categoryContacts.length})</span>
                </div>
                
                {categoryContacts.length === 0 ? (
                  <div className="text-gray-500 italic py-4 px-2">
                    No contacts in this category yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {categoryContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleContactClick(contact)}
                      >
                        <div className="grid items-center gap-6" style={{ gridTemplateColumns: "2fr 1.5fr 3fr 1.5fr auto" }}>
                          <div className="text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-gray-900">
                            {contact.role || ''}
                          </div>
                          <div className="text-gray-900">
                            {contact.email || ''}
                          </div>
                          <div className="text-gray-900">
                            {formatPhoneNumber(contact.phone)}
                          </div>
                          
                          <div className="flex gap-2">
                            <Calendar 
                              className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAvailabilityClick(contact);
                              }}
                            />
                            {contact.email && (
                              <Mail 
                                className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmailContact(contact.email!);
                                }}
                              />
                            )}
                            {contact.phone && (
                              <Phone 
                                className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${contact.phone}`;
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          isOpen={showContactModal}
          onClose={handleContactModalClose}
          onEdit={handleEditContact}
        />
      )}

      {/* Weekly Availability Modal */}
      {availabilityContact && (
        <WeeklyAvailabilityEditor
          contact={availabilityContact}
          isOpen={showAvailabilityModal}
          onOpenChange={setShowAvailabilityModal}
        />
      )}

      {/* New Contact Modal */}
      <Dialog open={showNewContactModal} onOpenChange={setShowNewContactModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            projectId={projectId}
            category="cast" // Default to cast, user can change it in the form
            onClose={handleNewContactModalClose}
            onSuccess={handleNewContactSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}