import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ContactGroup } from "@shared/schema";

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contactGroups: ContactGroup[];
  onImportSuccess: (importedData: { contacts: any[]; groups: string[] }) => void;
}

export function ImportContactsModal({
  open,
  onOpenChange,
  projectId,
  contactGroups,
  onImportSuccess,
}: ImportContactsModalProps) {
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const downloadTemplate = () => {
    const headers = ["First Name", "Last Name", "Preferred Name", "Group", "Role", "Email", "Mobile", "WhatsApp"];
    const exampleRow = ["John", "Doe", "Johnny", "Cast", "Lead Actor", "john@example.com", "555-1234", "555-1234"];
    const csv = [headers.join(","), exampleRow.join(",")].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contact-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: "Template downloaded successfully" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        
        if (lines.length < 1) {
          toast({
            title: "Empty file",
            description: "The CSV file appears to be empty",
            variant: "destructive",
          });
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const headerMap: Record<string, number> = {};
        
        // Map CSV headers to contact fields
        headers.forEach((header, index) => {
          if (header === "first name" || header === "firstname") headerMap["firstName"] = index;
          else if (header === "last name" || header === "lastname") headerMap["lastName"] = index;
          else if (header === "preferred name" || header === "preferredname") headerMap["preferredName"] = index;
          else if (header === "group") headerMap["group"] = index;
          else if (header === "role") headerMap["role"] = index;
          else if (header === "email") headerMap["email"] = index;
          else if (header === "mobile" || header === "phone") headerMap["phone"] = index;
          else if (header === "whatsapp") headerMap["whatsapp"] = index;
        });

        const contacts: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          
          const contact: any = {
            firstName: values[headerMap["firstName"]] || "",
            lastName: values[headerMap["lastName"]] || "",
            preferredName: values[headerMap["preferredName"]] || "",
            group: values[headerMap["group"]] || null,
            role: values[headerMap["role"]] || "",
            email: values[headerMap["email"]] || "",
            phone: values[headerMap["phone"]] || "",
            whatsapp: values[headerMap["whatsapp"]] || "",
          };

          // Only add if at least first and last name are provided
          if (contact.firstName || contact.lastName) {
            contacts.push(contact);
          }
        }

        setPreviewData(contacts);
        if (contacts.length === 0) {
          toast({
            title: "No valid contacts found",
            description: "Please ensure your CSV has at least First Name and Last Name columns",
            variant: "destructive",
          });
        } else {
          toast({
            title: "File parsed successfully",
            description: `Found ${contacts.length} contacts to import`,
          });
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast({
          title: "Error parsing file",
          description: "There was an error reading your CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(csvFile);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: "No contacts to import",
        description: "Please select a file with at least one contact",
        variant: "destructive",
      });
      return;
    }

    // Check if any contact has a group specified, or if a default group is selected
    const hasGroupInfo = previewData.some(c => c.group) || selectedGroupId;
    if (!hasGroupInfo) {
      toast({
        title: "Group required",
        description: "Either select a default group or include a 'Group' column in your CSV",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", `/api/projects/${projectId}/contacts/bulk-import`, {
        contacts: previewData,
        groupId: selectedGroupId ? parseInt(selectedGroupId) : null,
      });

      // Extract unique groups from imported data
      const importedGroups = [...new Set(previewData.map(c => c.group).filter(Boolean))];

      toast({
        title: "Import successful",
        description: `Successfully imported ${previewData.length} contacts`,
      });

      setFile(null);
      setPreviewData([]);
      setSelectedGroupId("");
      onOpenChange(false);
      onImportSuccess({ contacts: previewData, groups: importedGroups });
    } catch (error: any) {
      console.error("Error importing contacts:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "There was an error importing the contacts";
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Contact Sheet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Get Started</p>
            <p className="text-sm text-gray-600 mb-3">
              Download our template CSV file and fill it in with your contacts
            </p>
            <div className="space-y-2">
              <Button onClick={downloadTemplate} variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Download CSV Template
              </Button>
              <p className="text-xs text-gray-600">Tip: Add a "Group" column to assign contacts to different groups in one file</p>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="csv-file" className="text-sm font-medium">
              Upload Your Contacts
            </Label>
            <div className="mt-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Supported format: CSV (comma-separated values)
            </p>
          </div>

          {/* Group Selection (Optional) */}
          {previewData.length > 0 && (
            <div>
              <Label htmlFor="group-select" className="text-sm font-medium">
                Default Group <span className="text-gray-500 text-xs">(optional - can specify per contact in CSV)</span>
              </Label>
              {contactGroups.length === 0 ? (
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded border border-gray-200">
                  No groups created yet. You can either:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Specify groups in your CSV file</li>
                    <li>Create a group in the Contacts page first</li>
                  </ul>
                </div>
              ) : (
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger id="group-select" className="mt-2">
                    <SelectValue placeholder="Leave empty to use CSV groups..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Preview ({previewData.length} contacts)</Label>
              <div className="mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded">
                <div className="text-xs bg-gray-50 sticky top-0">
                  <div className="grid gap-2 p-2 font-medium border-b" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
                    <div>First Name</div>
                    <div>Last Name</div>
                    <div>Email</div>
                    <div>Group</div>
                    <div>Role</div>
                  </div>
                </div>
                <div className="text-xs">
                  {previewData.slice(0, 10).map((contact, idx) => (
                    <div key={idx} className="grid gap-2 p-2 border-b hover:bg-gray-50" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
                      <div className="truncate">{contact.firstName || "-"}</div>
                      <div className="truncate">{contact.lastName || "-"}</div>
                      <div className="truncate">{contact.email || "-"}</div>
                      <div className="truncate text-blue-600">{contact.group || (selectedGroupId ? contactGroups.find(g => g.id.toString() === selectedGroupId)?.name : "-")}</div>
                      <div className="truncate">{contact.role || "-"}</div>
                    </div>
                  ))}
                </div>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-gray-500 bg-gray-50">
                    +{previewData.length - 10} more contacts
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading || previewData.length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isLoading ? "Importing..." : "Import Contacts"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
