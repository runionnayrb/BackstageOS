import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { WeeklyAvailabilityEditor } from "@/components/weekly-availability-editor";
import { useState, useEffect } from "react";

interface ContactAvailabilityParams {
  id: string;
  contactId: string;
}

export default function ContactAvailability() {
  const [, setLocation] = useLocation();
  const params = useParams<ContactAvailabilityParams>();
  const projectId = parseInt(params.id!);
  const contactId = parseInt(params.contactId!);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: contact } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts/${contactId}`],
  });

  if (!project || !contact) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setLocation(`/shows/${projectId}/contacts`)} 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Contacts
              </Button>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <h1 className="text-xl font-semibold">
                  {contact.firstName} {contact.lastName} - Availability
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <p className="text-gray-600">
              Manage availability for {contact.firstName} {contact.lastName}. 
              Drag on the calendar to create availability blocks.
            </p>
          </div>
          
          {/* Weekly Availability Editor - Modified to not use Dialog */}
          <div className="bg-white rounded-lg border">
            <WeeklyAvailabilityEditorPage contact={contact} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Modified version of WeeklyAvailabilityEditor that works as a page component
function WeeklyAvailabilityEditorPage({ contact }: { contact: any }) {
  // This would need to be implemented based on the WeeklyAvailabilityEditor
  // but without the Dialog wrapper
  return (
    <div className="p-6">
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Availability Management</h3>
        <p className="text-gray-600">
          Weekly availability management for {contact.firstName} {contact.lastName}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This page is being implemented to provide the same functionality as the "Manage Availability" button.
        </p>
      </div>
    </div>
  );
}