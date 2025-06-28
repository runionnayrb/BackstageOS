import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Settings, GripVertical, Printer, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ContactSheetParams {
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

interface Column {
  id: string;
  label: string;
  width: number;
  visible: boolean;
}

export default function ContactSheet() {
  const [, setLocation] = useLocation();
  const params = useParams<ContactSheetParams>();
  const projectId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultCategories = [
    { id: "cast", title: "Cast" },
    { id: "crew", title: "Crew" },
    { id: "stage_management", title: "Stage Management" },
    { id: "creative_team", title: "Creative Team" },
    { id: "theater_staff", title: "Theater Staff" },
  ];

  const defaultColumns: Column[] = [
    { id: "fullName", label: "Full Name", width: 200, visible: true },
    { id: "role", label: "Position", width: 150, visible: true },
    { id: "email", label: "Email", width: 200, visible: true },
    { id: "phone", label: "Phone", width: 150, visible: true },
  ];

  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [categories, setCategories] = useState(defaultCategories);
  const [contactOrder, setContactOrder] = useState<Record<string, number[]>>({});
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [draggedContact, setDraggedContact] = useState<{ categoryId: string; contactIndex: number } | null>(null);
  const [isResizing, setIsResizing] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  const { data: allContacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
    enabled: !!projectId,
  });

  // Apply saved category order
  useEffect(() => {
    if (projectSettings && typeof projectSettings === 'object' && 'contactCategoriesOrder' in projectSettings && projectSettings.contactCategoriesOrder) {
      const savedOrder = projectSettings.contactCategoriesOrder as string[];
      const reorderedCategories = savedOrder.map((id: string) => 
        defaultCategories.find(cat => cat.id === id)
      ).filter((cat): cat is typeof defaultCategories[0] => cat !== undefined);
      
      const savedIds = new Set(savedOrder);
      const newCategories = defaultCategories.filter(cat => !savedIds.has(cat.id));
      
      setCategories([...reorderedCategories, ...newCategories] as typeof defaultCategories);
    }
  }, [projectSettings]);

  // Group contacts by category
  const contactsByCategory = categories.reduce((acc, category) => {
    const categoryContacts = allContacts.filter(contact => contact.category === category.id);
    
    // Apply custom order if it exists
    if (contactOrder[category.id]) {
      const orderedContacts = contactOrder[category.id]
        .map(id => categoryContacts.find(c => c.id === id))
        .filter(Boolean) as Contact[];
      
      // Add any new contacts not in the saved order
      const orderedIds = new Set(contactOrder[category.id]);
      const newContacts = categoryContacts.filter(c => !orderedIds.has(c.id));
      
      acc[category.id] = [...orderedContacts, ...newContacts];
    } else {
      acc[category.id] = categoryContacts.sort((a, b) => 
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
    }
    
    return acc;
  }, {} as Record<string, Contact[]>);

  // Handle column drag and drop
  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumn(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedColumn === null || draggedColumn === dropIndex) {
      setDraggedColumn(null);
      return;
    }

    const newColumns = [...columns];
    const draggedCol = newColumns[draggedColumn];
    
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(dropIndex, 0, draggedCol);
    
    setColumns(newColumns);
    setDraggedColumn(null);
  };

  // Handle contact drag and drop
  const handleContactDragStart = (e: React.DragEvent, categoryId: string, contactIndex: number) => {
    setDraggedContact({ categoryId, contactIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleContactDrop = (e: React.DragEvent, categoryId: string, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedContact || 
        draggedContact.categoryId !== categoryId || 
        draggedContact.contactIndex === dropIndex) {
      setDraggedContact(null);
      return;
    }

    const categoryContacts = [...contactsByCategory[categoryId]];
    const draggedContactData = categoryContacts[draggedContact.contactIndex];
    
    categoryContacts.splice(draggedContact.contactIndex, 1);
    categoryContacts.splice(dropIndex, 0, draggedContactData);
    
    // Update contact order
    const newContactOrder = {
      ...contactOrder,
      [categoryId]: categoryContacts.map(c => c.id)
    };
    setContactOrder(newContactOrder);
    setDraggedContact(null);
  };

  // Handle column resizing
  const handleMouseDown = (e: React.MouseEvent, columnIndex: number) => {
    setIsResizing(columnIndex);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columns[columnIndex].width);
    
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing !== null) {
        const diff = e.clientX - resizeStartX;
        const newWidth = Math.max(100, resizeStartWidth + diff);
        
        setColumns(prev => prev.map((col, idx) => 
          idx === isResizing ? { ...col, width: newWidth } : col
        ));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth]);

  const getCellValue = (contact: Contact, columnId: string): string => {
    switch (columnId) {
      case "fullName":
        return `${contact.firstName} ${contact.lastName}`;
      case "role":
        return contact.role || "";
      case "email":
        return contact.email || "";
      case "phone":
        return contact.phone || "";
      default:
        return "";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
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
    <div className="min-h-screen bg-gray-100">
      {/* Header - Hidden in print */}
      <div className="bg-background border-b print:hidden">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/shows/${projectId}/contacts`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Contacts
              </Button>
              <h1 className="text-2xl font-bold">Contact Sheet - {(project as any)?.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="flex items-center gap-2"
              >
                {isPreviewMode ? (
                  <>
                    <Edit className="h-4 w-4" />
                    Edit Mode
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Container */}
      <div className="p-8 print:p-0">
        <div className="max-w-none mx-auto bg-white shadow-lg print:shadow-none print:max-w-none" 
             style={{ width: '8.5in', minHeight: '11in' }}>
          
          {/* Print Header */}
          <div className="p-8 print:p-6">
            <div className="text-center mb-8 print:mb-6">
              <h1 className="text-2xl font-bold mb-2">{(project as any)?.name}</h1>
              <h2 className="text-lg text-gray-600">Contact Sheet</h2>
              <p className="text-sm text-gray-500 mt-2">
                Generated on {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Contact Table by Category */}
            <div className="space-y-8 print:space-y-6">
              {categories.map(category => {
                const categoryContacts = contactsByCategory[category.id] || [];
                
                if (categoryContacts.length === 0) return null;

                return (
                  <div key={category.id} className="break-inside-avoid">
                    <h3 className="text-lg font-semibold mb-4 print:mb-3 pb-2">
                      {category.title}
                    </h3>
                    
                    {/* Table Header */}
                    <div className="border-b-2 border-gray-800 mb-2">
                      <div className="flex print:text-sm">
                        {!isPreviewMode && columns.filter(col => col.visible).map((column, colIndex) => (
                          <div
                            key={column.id}
                            className="relative font-semibold py-2 px-2 print:px-1 border-r border-gray-300 last:border-r-0 print:hidden"
                            style={{ width: `${column.width}px` }}
                            draggable
                            onDragStart={(e) => handleColumnDragStart(e, colIndex)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleColumnDrop(e, colIndex)}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                              <span>{column.label}</span>
                            </div>
                            
                            {/* Resize Handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                              onMouseDown={(e) => handleMouseDown(e, colIndex)}
                            />
                          </div>
                        ))}
                        
                        {/* Preview/Print version of headers */}
                        <div className={`${isPreviewMode ? 'flex w-full' : 'hidden print:flex print:w-full'}`}>
                          {columns.filter(col => col.visible).map((column) => (
                            <div
                              key={column.id}
                              className="font-semibold py-2 px-3 border-r border-gray-300 last:border-r-0 flex-1"
                            >
                              {column.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Table Rows */}
                    <div className="space-y-1 print:space-y-0">
                      {categoryContacts.map((contact, contactIndex) => (
                        <div
                          key={contact.id}
                          className={`flex border-b border-gray-200 print:text-sm print:border-gray-300 ${
                            !isPreviewMode ? 'hover:bg-gray-50 print:hover:bg-transparent' : ''
                          }`}
                          draggable={!isPreviewMode}
                          onDragStart={!isPreviewMode ? (e) => handleContactDragStart(e, category.id, contactIndex) : undefined}
                          onDragOver={!isPreviewMode ? (e) => e.preventDefault() : undefined}
                          onDrop={!isPreviewMode ? (e) => handleContactDrop(e, category.id, contactIndex) : undefined}
                        >
                          {/* Edit mode version */}
                          {!isPreviewMode && columns.filter(col => col.visible).map((column) => (
                            <div
                              key={column.id}
                              className="py-2 px-2 border-r border-gray-300 last:border-r-0 print:hidden overflow-hidden text-ellipsis whitespace-nowrap"
                              style={{ width: `${column.width}px` }}
                            >
                              {getCellValue(contact, column.id)}
                            </div>
                          ))}
                          
                          {/* Preview/Print version */}
                          <div className={`${isPreviewMode ? 'flex w-full' : 'hidden print:flex print:w-full'}`}>
                            {columns.filter(col => col.visible).map((column) => (
                              <div
                                key={column.id}
                                className="py-1 px-3 border-r border-gray-300 last:border-r-0 flex-1 overflow-hidden text-ellipsis"
                                style={{ fontSize: isPreviewMode ? '14px' : '11px', lineHeight: isPreviewMode ? '16px' : '14px' }}
                              >
                                {getCellValue(contact, column.id)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Column Settings Panel - Hidden in print and preview mode */}
      {!isPreviewMode && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white border rounded-lg shadow-lg p-4 print:hidden">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Columns
          </h4>
          <div className="space-y-2">
            {columns.map((column, index) => (
              <label key={column.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={(e) => {
                    setColumns(prev => prev.map((col, idx) => 
                      idx === index ? { ...col, visible: e.target.checked } : col
                    ));
                  }}
                  className="rounded"
                />
                {column.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}