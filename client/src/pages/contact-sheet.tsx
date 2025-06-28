import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { 
  ArrowLeft, Settings, GripVertical, Printer, Eye, Edit,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Palette, Type, Square, Minus, ChevronDown, Grid3X3, Clipboard
} from "lucide-react";
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
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(40);
  const [rowHeight, setRowHeight] = useState(32);
  const [isResizingHeight, setIsResizingHeight] = useState<'header' | 'row' | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  const [headerAlignment, setHeaderAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [rowAlignment, setRowAlignment] = useState<'left' | 'center' | 'right'>('left');
  
  // Header formatting states
  const [headerBold, setHeaderBold] = useState(false);
  const [headerItalic, setHeaderItalic] = useState(false);
  const [headerUnderline, setHeaderUnderline] = useState(false);
  const [headerTextColor, setHeaderTextColor] = useState('#000000');
  const [headerBgColor, setHeaderBgColor] = useState('#ffffff');
  const [headerFontSize, setHeaderFontSize] = useState(14);
  const [headerFontFamily, setHeaderFontFamily] = useState('system-ui');
  const [headerBorders, setHeaderBorders] = useState({
    all: false,
    top: false,
    right: false,
    bottom: false,
    left: false
  });
  const [headerBorderColor, setHeaderBorderColor] = useState('#d1d5db');
  const [headerBorderWidth, setHeaderBorderWidth] = useState(1);
  
  // Row formatting states
  const [rowBold, setRowBold] = useState(false);
  const [rowItalic, setRowItalic] = useState(false);
  const [rowUnderline, setRowUnderline] = useState(false);
  const [rowTextColor, setRowTextColor] = useState('#000000');
  const [rowBgColor, setRowBgColor] = useState('#ffffff');
  const [rowFontSize, setRowFontSize] = useState(12);
  const [rowFontFamily, setRowFontFamily] = useState('system-ui');
  const [rowBorders, setRowBorders] = useState({
    all: false,
    top: false,
    right: false,
    bottom: false,
    left: false
  });
  const [rowBorderColor, setRowBorderColor] = useState('#d1d5db');
  const [rowBorderWidth, setRowBorderWidth] = useState(1);
  
  // Alternate row colors
  const [alternateRows, setAlternateRows] = useState(false);
  const [firstRowColor, setFirstRowColor] = useState('#ffffff');
  const [secondRowColor, setSecondRowColor] = useState('#f9fafb');
  
  // Margin settings modal
  const [showMarginsModal, setShowMarginsModal] = useState(false);
  const [pageMargins, setPageMargins] = useState({
    top: 1,
    right: 1,
    bottom: 1,
    left: 1
  });
  const [headerFooterMargins, setHeaderFooterMargins] = useState({
    header: 0.5,
    footer: 0.5
  });
  
  const [activeTarget, setActiveTarget] = useState<'header' | 'row'>('header');

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

  // Handle category drag and drop
  const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedCategory(categoryId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCategoryDrop = (e: React.DragEvent, dropCategoryId: string) => {
    e.preventDefault();
    
    if (!draggedCategory || draggedCategory === dropCategoryId) {
      setDraggedCategory(null);
      return;
    }

    const currentCategories = [...categories];
    const draggedIndex = currentCategories.findIndex(cat => cat.id === draggedCategory);
    const dropIndex = currentCategories.findIndex(cat => cat.id === dropCategoryId);
    
    const draggedCategoryData = currentCategories[draggedIndex];
    currentCategories.splice(draggedIndex, 1);
    currentCategories.splice(dropIndex, 0, draggedCategoryData);
    
    setCategories(currentCategories);
    setDraggedCategory(null);
  };

  // Handle column resizing
  const handleMouseDown = (e: React.MouseEvent, columnIndex: number) => {
    setIsResizing(columnIndex);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columns[columnIndex].width);
    
    e.preventDefault();
  };

  // Handle header height resizing
  const handleHeaderHeightMouseDown = (e: React.MouseEvent) => {
    setIsResizingHeight('header');
    setResizeStartY(e.clientY);
    setResizeStartHeight(headerHeight);
    
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle row height resizing
  const handleRowHeightMouseDown = (e: React.MouseEvent) => {
    setIsResizingHeight('row');
    setResizeStartY(e.clientY);
    setResizeStartHeight(rowHeight);
    
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing !== null) {
        const diff = e.clientX - resizeStartX;
        const newWidth = Math.max(100, resizeStartWidth + diff);
        
        setColumns(prev => prev.map((col, idx) => 
          idx === isResizing ? { ...col, width: newWidth } : col
        ));
      } else if (isResizingHeight !== null) {
        e.preventDefault();
        const deltaY = e.clientY - resizeStartY;
        const newHeight = Math.max(20, resizeStartHeight + deltaY);
        
        if (isResizingHeight === 'header') {
          setHeaderHeight(newHeight);
        } else if (isResizingHeight === 'row') {
          setRowHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      setIsResizingHeight(null);
    };

    if (isResizing !== null || isResizingHeight !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth, isResizingHeight, resizeStartY, resizeStartHeight]);

  const getAlignmentClass = (alignment: 'left' | 'center' | 'right'): string => {
    switch (alignment) {
      case 'center': return 'text-center justify-center';
      case 'right': return 'text-right justify-end';
      default: return 'text-left justify-start';
    }
  };

  const getHeaderStyle = () => ({
    fontWeight: headerBold ? 'bold' : 'normal',
    fontStyle: headerItalic ? 'italic' : 'normal',
    textDecoration: headerUnderline ? 'underline' : 'none',
    color: headerTextColor,
    backgroundColor: headerBgColor,
    fontSize: `${headerFontSize}px`,
    fontFamily: headerFontFamily,
    ...getBorderStyle(headerBorders, headerBorderColor, headerBorderWidth),
  });

  const getRowStyle = (rowIndex?: number) => {
    let backgroundColor = rowBgColor;
    
    // Apply alternate row coloring if enabled and rowIndex is provided
    if (alternateRows && rowIndex !== undefined) {
      backgroundColor = rowIndex % 2 === 0 ? firstRowColor : secondRowColor;
    }
    
    return {
      fontWeight: rowBold ? 'bold' : 'normal',
      fontStyle: rowItalic ? 'italic' : 'normal',
      textDecoration: rowUnderline ? 'underline' : 'none',
      color: rowTextColor,
      backgroundColor: backgroundColor,
      fontSize: `${rowFontSize}px`,
      fontFamily: rowFontFamily,
      ...getBorderStyle(rowBorders, rowBorderColor, rowBorderWidth),
    };
  };

  const getBorderStyle = (borders: any, borderColor: string, borderWidth: number) => {
    if (!borders || (!borders.all && !borders.top && !borders.right && !borders.bottom && !borders.left)) {
      return {};
    }
    
    return {
      borderTopWidth: borders.top ? `${borderWidth}px` : '0',
      borderRightWidth: borders.right ? `${borderWidth}px` : '0',
      borderBottomWidth: borders.bottom ? `${borderWidth}px` : '0',
      borderLeftWidth: borders.left ? `${borderWidth}px` : '0',
      borderStyle: 'solid',
      borderColor: borderColor,
    };
  };

  const toggleBorder = (side: 'all' | 'top' | 'right' | 'bottom' | 'left') => {
    if (activeTarget === 'header') {
      if (side === 'all') {
        const newValue = !headerBorders.all;
        setHeaderBorders({
          all: newValue,
          top: newValue,
          right: newValue,
          bottom: newValue,
          left: newValue
        });
      } else {
        setHeaderBorders(prev => ({
          ...prev,
          [side]: !prev[side],
          all: false // Turn off "all" when individual sides are toggled
        }));
      }
    } else {
      if (side === 'all') {
        const newValue = !rowBorders.all;
        setRowBorders({
          all: newValue,
          top: newValue,
          right: newValue,
          bottom: newValue,
          left: newValue
        });
      } else {
        setRowBorders(prev => ({
          ...prev,
          [side]: !prev[side],
          all: false
        }));
      }
    }
  };

  const fontOptions = [
    { value: 'system-ui', label: 'System' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Times', label: 'Times' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Courier', label: 'Courier' },
    { value: 'Helvetica', label: 'Helvetica' },
  ];

  const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return "";
    // Convert to string if needed
    const phoneStr = String(phone).trim();
    // Remove all non-digit characters
    const digits = phoneStr.replace(/\D/g, "");
    // Format as (xxx) xxx-xxxx if we have 10 digits
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // Format 11 digits (remove leading 1 if present)
    if (digits.length === 11 && digits.startsWith('1')) {
      const tenDigits = digits.slice(1);
      return `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
    }
    // Return original if not standard format
    return phoneStr;
  };

  const getCellValue = (contact: Contact, columnId: string): string => {
    switch (columnId) {
      case "fullName":
        return `${contact.firstName} ${contact.lastName}`;
      case "role":
        return contact.role || "";
      case "email":
        return contact.email || "";
      case "phone":
        return formatPhoneNumber(contact.phone || "");
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
          
          {/* Formatting Toolbar - Only show in edit mode */}
          {!isPreviewMode && (
            <div className="mt-4 pb-4 border-b bg-gray-50 rounded-lg p-4">
              {/* Target Selector */}
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm font-medium">Format:</label>
                <div className="flex items-center border rounded bg-white">
                  <button
                    onClick={() => setActiveTarget('header')}
                    className={`px-3 py-1 text-sm ${activeTarget === 'header' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                  >
                    Headers
                  </button>
                  <button
                    onClick={() => setActiveTarget('row')}
                    className={`px-3 py-1 text-sm border-l ${activeTarget === 'row' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                  >
                    Rows
                  </button>
                </div>
              </div>

              {/* Formatting Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Margins Button */}
                <button
                  onClick={() => setShowMarginsModal(true)}
                  className="p-2 border rounded bg-white hover:bg-gray-100"
                  title="Page & Margin Settings"
                >
                  <Clipboard className="h-4 w-4" />
                </button>

                {/* Text Style Buttons */}
                <div className="flex items-center border rounded bg-white">
                  <button
                    onClick={() => activeTarget === 'header' ? setHeaderBold(!headerBold) : setRowBold(!rowBold)}
                    className={`p-2 hover:bg-gray-100 ${
                      (activeTarget === 'header' ? headerBold : rowBold) ? 'bg-gray-200' : ''
                    }`}
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => activeTarget === 'header' ? setHeaderItalic(!headerItalic) : setRowItalic(!rowItalic)}
                    className={`p-2 hover:bg-gray-100 border-x ${
                      (activeTarget === 'header' ? headerItalic : rowItalic) ? 'bg-gray-200' : ''
                    }`}
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => activeTarget === 'header' ? setHeaderUnderline(!headerUnderline) : setRowUnderline(!rowUnderline)}
                    className={`p-2 hover:bg-gray-100 ${
                      (activeTarget === 'header' ? headerUnderline : rowUnderline) ? 'bg-gray-200' : ''
                    }`}
                    title="Underline"
                  >
                    <Underline className="h-4 w-4" />
                  </button>
                </div>

                {/* Text Alignment */}
                <div className="flex items-center border rounded bg-white">
                  <button
                    onClick={() => activeTarget === 'header' ? setHeaderAlignment('left') : setRowAlignment('left')}
                    className={`p-2 hover:bg-gray-100 ${
                      (activeTarget === 'header' ? headerAlignment : rowAlignment) === 'left' ? 'bg-gray-200' : ''
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => activeTarget === 'header' ? setHeaderAlignment('center') : setRowAlignment('center')}
                    className={`p-2 hover:bg-gray-100 border-x ${
                      (activeTarget === 'header' ? headerAlignment : rowAlignment) === 'center' ? 'bg-gray-200' : ''
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => activeTarget === 'header' ? setHeaderAlignment('right') : setRowAlignment('right')}
                    className={`p-2 hover:bg-gray-100 ${
                      (activeTarget === 'header' ? headerAlignment : rowAlignment) === 'right' ? 'bg-gray-200' : ''
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Font Family */}
                <select
                  value={activeTarget === 'header' ? headerFontFamily : rowFontFamily}
                  onChange={(e) => activeTarget === 'header' ? setHeaderFontFamily(e.target.value) : setRowFontFamily(e.target.value)}
                  className="border rounded bg-white px-2 py-1 text-sm outline-none"
                >
                  {fontOptions.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>

                {/* Font Size */}
                <div className="flex items-center gap-1 border rounded bg-white px-2">
                  <Type className="h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    min="8"
                    max="24"
                    value={activeTarget === 'header' ? headerFontSize : rowFontSize}
                    onChange={(e) => activeTarget === 'header' ? setHeaderFontSize(Number(e.target.value)) : setRowFontSize(Number(e.target.value))}
                    className="w-12 text-sm py-1 text-center border-0 outline-none"
                  />
                </div>

                {/* Text Color */}
                <div className="flex items-center border rounded bg-white">
                  <input
                    type="color"
                    value={activeTarget === 'header' ? headerTextColor : rowTextColor}
                    onChange={(e) => activeTarget === 'header' ? setHeaderTextColor(e.target.value) : setRowTextColor(e.target.value)}
                    className="w-8 h-8 border-0 cursor-pointer"
                    title="Text Color"
                  />
                  <Palette className="h-4 w-4 text-gray-500 mx-1" />
                </div>

                {/* Background Color */}
                <div className="flex items-center border rounded bg-white">
                  <input
                    type="color"
                    value={activeTarget === 'header' ? headerBgColor : rowBgColor}
                    onChange={(e) => activeTarget === 'header' ? setHeaderBgColor(e.target.value) : setRowBgColor(e.target.value)}
                    className="w-8 h-8 border-0 cursor-pointer"
                    title="Background Color"
                  />
                  <Square className="h-4 w-4 text-gray-500 mx-1" />
                </div>

                {/* Border Controls */}
                <div className="flex items-center gap-1 border rounded bg-white px-2 py-1">
                  <Grid3X3 className="h-4 w-4 text-gray-500" />
                  <div className="flex gap-1">
                    {/* All Borders */}
                    <button
                      onClick={() => toggleBorder('all')}
                      className={`px-2 py-1 text-xs rounded ${
                        (activeTarget === 'header' ? headerBorders.all : rowBorders.all) ? 'bg-blue-500 text-white' : 'bg-gray-100'
                      }`}
                      title="All Borders"
                    >
                      All
                    </button>
                    {/* Individual Borders */}
                    <button
                      onClick={() => toggleBorder('top')}
                      className={`px-1 py-1 text-xs rounded ${
                        (activeTarget === 'header' ? headerBorders.top : rowBorders.top) ? 'bg-blue-500 text-white' : 'bg-gray-100'
                      }`}
                      title="Top Border"
                    >
                      T
                    </button>
                    <button
                      onClick={() => toggleBorder('right')}
                      className={`px-1 py-1 text-xs rounded ${
                        (activeTarget === 'header' ? headerBorders.right : rowBorders.right) ? 'bg-blue-500 text-white' : 'bg-gray-100'
                      }`}
                      title="Right Border"
                    >
                      R
                    </button>
                    <button
                      onClick={() => toggleBorder('bottom')}
                      className={`px-1 py-1 text-xs rounded ${
                        (activeTarget === 'header' ? headerBorders.bottom : rowBorders.bottom) ? 'bg-blue-500 text-white' : 'bg-gray-100'
                      }`}
                      title="Bottom Border"
                    >
                      B
                    </button>
                    <button
                      onClick={() => toggleBorder('left')}
                      className={`px-1 py-1 text-xs rounded ${
                        (activeTarget === 'header' ? headerBorders.left : rowBorders.left) ? 'bg-blue-500 text-white' : 'bg-gray-100'
                      }`}
                      title="Left Border"
                    >
                      L
                    </button>
                  </div>
                </div>

                {/* Border Color */}
                <div className="flex items-center border rounded bg-white">
                  <input
                    type="color"
                    value={activeTarget === 'header' ? headerBorderColor : rowBorderColor}
                    onChange={(e) => activeTarget === 'header' ? setHeaderBorderColor(e.target.value) : setRowBorderColor(e.target.value)}
                    className="w-8 h-8 border-0 cursor-pointer"
                    title="Border Color"
                  />
                  <Minus className="h-4 w-4 text-gray-500 mx-1" />
                </div>

                {/* Border Width */}
                <div className="flex items-center gap-1 border rounded bg-white px-2">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={activeTarget === 'header' ? headerBorderWidth : rowBorderWidth}
                    onChange={(e) => activeTarget === 'header' ? setHeaderBorderWidth(Number(e.target.value)) : setRowBorderWidth(Number(e.target.value))}
                    className="w-8 text-sm py-1 text-center border-0 outline-none"
                  />
                  <span className="text-xs text-gray-500">px</span>
                </div>

                {/* Alternate Row Colors - Only show for rows */}
                {activeTarget === 'row' && (
                  <div className="border-l pl-3 ml-3">
                    <div className="text-xs font-medium text-gray-700 mb-1">Alternate Rows</div>
                    <div className="flex items-center gap-2">
                      {/* Toggle Switch */}
                      <div className="flex flex-col items-center gap-1">
                        <div 
                          onClick={() => setAlternateRows(!alternateRows)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${
                            alternateRows ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          title="Toggle Alternate Row Colors"
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              alternateRows ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Color Pickers */}
                      {alternateRows && (
                        <>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-gray-500">1st</span>
                            <input
                              type="color"
                              value={firstRowColor}
                              onChange={(e) => setFirstRowColor(e.target.value)}
                              className="w-6 h-6 rounded border cursor-pointer"
                              title="First Row Color"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-gray-500">2nd</span>
                            <input
                              type="color"
                              value={secondRowColor}
                              onChange={(e) => setSecondRowColor(e.target.value)}
                              className="w-6 h-6 rounded border cursor-pointer"
                              title="Second Row Color"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Preview Container */}
      <div className="p-8 print:p-0">
        <div className="max-w-none mx-auto bg-white shadow-lg print:shadow-none print:max-w-none" 
             style={{ 
               width: '8.5in', 
               minHeight: '11in',
               paddingTop: `${pageMargins.top}in`,
               paddingRight: `${pageMargins.right}in`,
               paddingLeft: `${pageMargins.left}in`,
               paddingBottom: `${pageMargins.bottom}in`,
               boxSizing: 'border-box',
               border: isPreviewMode ? 'none' : '2px dashed #ff0000'
             }}
          >
          {/* Page Header */}
          <div 
            className="text-center mb-8 print:mb-6"
            style={{
              marginTop: `${headerFooterMargins.header}in`
            }}
          >
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
                  <div 
                    key={category.id} 
                    className="break-inside-avoid"
                    draggable={!isPreviewMode}
                    onDragStart={!isPreviewMode ? (e) => handleCategoryDragStart(e, category.id) : undefined}
                    onDragOver={!isPreviewMode ? (e) => e.preventDefault() : undefined}
                    onDrop={!isPreviewMode ? (e) => handleCategoryDrop(e, category.id) : undefined}
                  >
                    <div className={`mb-4 print:mb-3 pb-2 ${!isPreviewMode ? 'cursor-grab hover:bg-gray-50 rounded px-2 py-1' : ''}`}>
                      <h3 className="text-lg font-semibold">
                        {category.title}
                      </h3>
                    </div>
                    
                    {/* Table Header */}
                    <div className="border-b-2 border-gray-800 mb-2">
                      <div className="flex print:text-sm">
                        {!isPreviewMode && columns.filter(col => col.visible).map((column, colIndex) => (
                          <div
                            key={column.id}
                            className={`relative px-3 print:px-1 print:hidden cursor-grab hover:bg-gray-50 flex items-center ${getAlignmentClass(headerAlignment)}`}
                            style={{ 
                              width: `${column.width}px`, 
                              height: `${headerHeight}px`,
                              ...getHeaderStyle()
                            }}
                            draggable
                            onDragStart={(e) => handleColumnDragStart(e, colIndex)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleColumnDrop(e, colIndex)}
                          >
                            {column.label}
                            
                            {/* Column Resize Handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                              onMouseDown={(e) => handleMouseDown(e, colIndex)}
                            />
                            
                            {/* Row Height Resize Handle */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-green-500 hover:opacity-50"
                              onMouseDown={(e) => handleHeaderHeightMouseDown(e)}
                            />
                          </div>
                        ))}
                        
                        {/* Preview/Print version of headers */}
                        <div className={`${isPreviewMode ? 'flex w-full' : 'hidden print:flex print:w-full'}`}>
                          {columns.filter(col => col.visible).map((column) => (
                            <div
                              key={column.id}
                              className={`px-3 flex items-center ${getAlignmentClass(headerAlignment)}`}
                              style={{ 
                                width: `${column.width}px`, 
                                height: `${headerHeight}px`,
                                ...getHeaderStyle()
                              }}
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
                          className={`flex print:text-sm ${
                            !isPreviewMode ? 'hover:bg-gray-50 print:hover:bg-transparent' : ''
                          }`}
                          draggable={!isPreviewMode}
                          onDragStart={!isPreviewMode ? (e) => handleContactDragStart(e, category.id, contactIndex) : undefined}
                          onDragOver={!isPreviewMode ? (e) => e.preventDefault() : undefined}
                          onDrop={!isPreviewMode ? (e) => handleContactDrop(e, category.id, contactIndex) : undefined}
                        >
                          {/* Edit mode version */}
                          {!isPreviewMode && columns.filter(col => col.visible).map((column, cellIndex) => (
                            <div
                              key={column.id}
                              className={`relative px-3 print:hidden overflow-hidden text-ellipsis whitespace-nowrap cursor-grab hover:bg-gray-50 flex items-center ${getAlignmentClass(rowAlignment)}`}
                              style={{ 
                                width: `${column.width}px`, 
                                height: `${rowHeight}px`,
                                ...getRowStyle(contactIndex)
                              }}
                            >
                              {getCellValue(contact, column.id)}
                              
                              {/* Row Height Resize Handle - only on first cell */}
                              {cellIndex === 0 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-orange-500 hover:opacity-50"
                                  onMouseDown={(e) => handleRowHeightMouseDown(e)}
                                />
                              )}
                            </div>
                          ))}
                          
                          {/* Preview/Print version */}
                          <div className={`${isPreviewMode ? 'flex w-full' : 'hidden print:flex print:w-full'}`}>
                            {columns.filter(col => col.visible).map((column) => (
                              <div
                                key={column.id}
                                className={`px-3 overflow-hidden text-ellipsis flex items-center ${getAlignmentClass(rowAlignment)}`}
                                style={{ 
                                  width: `${column.width}px`,
                                  height: `${rowHeight}px`,
                                  ...getRowStyle(contactIndex)
                                }}
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

          {/* Page Footer */}
          <div 
            className="text-center text-xs text-gray-500 mt-8 print:mt-6"
            style={{
              marginBottom: `${headerFooterMargins.footer}in`
            }}
          >
            Page 1 of 1
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

      {/* Margins Modal */}
      {showMarginsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Page & Margin Settings</h3>
              <button
                onClick={() => setShowMarginsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Header & Footer Margins */}
              <div>
                <h4 className="font-medium mb-3 text-gray-700">Header & Footer Margins</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Header</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.25"
                        value={headerFooterMargins.header}
                        onChange={(e) => setHeaderFooterMargins(prev => ({
                          ...prev,
                          header: Number(e.target.value)
                        }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">in</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Footer</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.25"
                        value={headerFooterMargins.footer}
                        onChange={(e) => setHeaderFooterMargins(prev => ({
                          ...prev,
                          footer: Number(e.target.value)
                        }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">in</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Margins */}
              <div>
                <h4 className="font-medium mb-3 text-gray-700">Page Margins</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Top</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.25"
                        value={pageMargins.top}
                        onChange={(e) => setPageMargins(prev => ({
                          ...prev,
                          top: Number(e.target.value)
                        }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">in</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Right</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.25"
                        value={pageMargins.right}
                        onChange={(e) => setPageMargins(prev => ({
                          ...prev,
                          right: Number(e.target.value)
                        }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">in</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bottom</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.25"
                        value={pageMargins.bottom}
                        onChange={(e) => setPageMargins(prev => ({
                          ...prev,
                          bottom: Number(e.target.value)
                        }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">in</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Left</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.25"
                        value={pageMargins.left}
                        onChange={(e) => setPageMargins(prev => ({
                          ...prev,
                          left: Number(e.target.value)
                        }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">in</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowMarginsModal(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowMarginsModal(false)}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}