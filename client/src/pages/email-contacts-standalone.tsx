import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  projectId?: number;
}

export default function EmailContactsStandalone() {
  const [, setLocation] = useLocation();

  // Fetch global contacts for email system with caching and background updates
  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const formatContactName = (contact: Contact) => 
    `${contact.firstName} ${contact.lastName}`;

  const getContactEmail = (contact: Contact) => 
    contact.email || `${contact.firstName.toLowerCase()}.${contact.lastName.toLowerCase()}@example.com`;

  // Show minimal loading state without full page spinner
  if (isLoading && contacts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/email')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Email
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Email Contacts</h1>
          </div>
          {error && (
            <span className="text-sm text-red-500">Failed to load contacts</span>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Contacts</p>
                  <p className="text-2xl font-bold">{contacts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">With Email</p>
                  <p className="text-2xl font-bold">
                    {contacts.filter(c => c.email).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold">
                    {new Set(contacts.filter(c => c.projectId).map(c => c.projectId)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              All Contacts
              {isLoading && contacts.length > 0 && (
                <span className="text-sm text-gray-500 font-normal">Updating...</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No contacts found</p>
                <p className="text-sm text-gray-500">
                  Contacts will appear here as you add them to your projects
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatContactName(contact)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {getContactEmail(contact)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {contact.role && (
                        <Badge variant="secondary" className="text-xs">
                          {contact.role}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const email = getContactEmail(contact);
                          window.location.href = `mailto:${email}`;
                        }}
                        className="flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        Email
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}