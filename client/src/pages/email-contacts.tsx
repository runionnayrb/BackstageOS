import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { InlineEmailComposer } from "@/components/email/inline-email-composer";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  projectId?: number;
}

interface Project {
  id: number;
  name: string;
}

export default function EmailContacts() {
  const [, setLocation] = useLocation();
  const [hoveredContactId, setHoveredContactId] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<string>('');

  // Fetch global contacts for email system with caching
  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: true,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch all projects to get show names
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: true,
  });
  
  // Fetch user's email accounts
  const { data: emailAccounts = [] } = useQuery({
    queryKey: ['/api/email/accounts'],
  });
  
  // Get the default email account
  const defaultAccount = emailAccounts.find((account: any) => account.isDefault) || emailAccounts[0];

  // Debug logging
  console.log('📧 Email Contacts Page:', {
    contacts: contacts,
    contactsLength: contacts.length,
    isLoading,
    error
  });

  const formatContactName = (contact: Contact) => 
    `${contact.firstName} ${contact.lastName}`;

  const getContactEmail = (contact: Contact) => 
    contact.email || `${contact.firstName.toLowerCase()}.${contact.lastName.toLowerCase()}@example.com`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
              <div className="space-y-1">
                {contacts.map((contact) => {
                  const project = projects.find(p => p.id === contact.projectId);
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onMouseEnter={() => setHoveredContactId(contact.id)}
                      onMouseLeave={() => setHoveredContactId(null)}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 w-64">
                          {formatContactName(contact)}
                        </span>
                        <button
                          onClick={() => {
                            const email = getContactEmail(contact);
                            setComposeRecipient(email);
                            setShowComposer(true);
                          }}
                          className={`p-1 rounded transition-all mr-2 ${
                            hoveredContactId === contact.id
                              ? 'opacity-100 hover:bg-gray-200'
                              : 'opacity-0'
                          }`}
                        >
                          <Mail className="w-4 h-4 text-gray-700" />
                        </button>
                        <span className="text-gray-600">
                          {getContactEmail(contact)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {project && (
                          <Badge variant="secondary" className="text-xs">
                            {project.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inline Email Composer */}
      {showComposer && (
        <InlineEmailComposer
          isOpen={showComposer}
          onClose={() => {
            setShowComposer(false);
            setComposeRecipient('');
          }}
          initialRecipient={composeRecipient}
          accountId={defaultAccount?.id}
        />
      )}
    </div>
  );
}