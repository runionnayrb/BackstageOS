import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ConflictTestProps {
  projectId: string;
  contacts: any[];
}

export default function ConflictValidationTest({ projectId, contacts }: ConflictTestProps) {
  const [availabilityData, setAvailabilityData] = useState({
    contactId: '',
    date: '2025-07-17',
    startTime: '10:00',
    endTime: '12:00',
    availabilityType: 'unavailable',
    notes: 'Test availability conflict'
  });

  const [eventData, setEventData] = useState({
    title: 'Test Event',
    description: 'Testing conflict validation',
    date: '2025-07-17',
    startTime: '11:00',
    endTime: '13:00',
    type: 'rehearsal',
    location: 'Studio A',
    participants: []
  });

  const [testResults, setTestResults] = useState<any[]>([]);
  const { toast } = useToast();

  const addTestResult = (result: any) => {
    setTestResults(prev => [...prev, { ...result, timestamp: new Date().toLocaleTimeString() }]);
  };

  const createAvailabilityConflict = async () => {
    try {
      const response = await apiRequest('POST', `/api/projects/${projectId}/contact-availability`, availabilityData);
      addTestResult({
        type: 'success',
        action: 'Create Availability Conflict',
        message: 'Availability conflict created successfully',
        data: response
      });
      toast({ title: 'Availability conflict created', description: 'Ready to test scheduling conflict' });
    } catch (error: any) {
      addTestResult({
        type: 'error',
        action: 'Create Availability Conflict',
        message: error.message || 'Failed to create availability conflict',
        data: error
      });
      toast({ title: 'Failed to create availability conflict', description: error.message, variant: 'destructive' });
    }
  };

  const testConflictValidation = async () => {
    try {
      const response = await apiRequest('POST', `/api/projects/${projectId}/schedule-events`, eventData);
      addTestResult({
        type: 'warning',
        action: 'Test Conflict Validation',
        message: 'Event created - conflict validation may not be working',
        data: response
      });
      toast({ title: 'Event created', description: 'Conflict validation may not be working correctly' });
    } catch (error: any) {
      if (error.status === 409) {
        addTestResult({
          type: 'success',
          action: 'Test Conflict Validation',
          message: 'Conflict validation working correctly - event blocked',
          data: error.data
        });
        toast({ title: 'Conflict validation working!', description: 'Event was correctly blocked due to conflicts' });
      } else {
        addTestResult({
          type: 'error',
          action: 'Test Conflict Validation',
          message: error.message || 'Unexpected error during validation',
          data: error
        });
        toast({ title: 'Unexpected error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Conflict Validation Test Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Create Availability Conflict */}
          <div className="space-y-4">
            <h3 className="font-semibold">Step 1: Create Availability Conflict</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactId">Contact</Label>
                <select
                  id="contactId"
                  className="w-full p-2 border rounded"
                  value={availabilityData.contactId}
                  onChange={(e) => setAvailabilityData(prev => ({ ...prev, contactId: e.target.value }))}
                >
                  <option value="">Select Contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="availabilityDate">Date</Label>
                <Input
                  id="availabilityDate"
                  type="date"
                  value={availabilityData.date}
                  onChange={(e) => setAvailabilityData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="availabilityStartTime">Start Time</Label>
                <Input
                  id="availabilityStartTime"
                  type="time"
                  value={availabilityData.startTime}
                  onChange={(e) => setAvailabilityData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="availabilityEndTime">End Time</Label>
                <Input
                  id="availabilityEndTime"
                  type="time"
                  value={availabilityData.endTime}
                  onChange={(e) => setAvailabilityData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="availabilityNotes">Notes</Label>
              <Input
                id="availabilityNotes"
                value={availabilityData.notes}
                onChange={(e) => setAvailabilityData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Reason for unavailability"
              />
            </div>
            <Button onClick={createAvailabilityConflict} disabled={!availabilityData.contactId}>
              Create Availability Conflict
            </Button>
          </div>

          {/* Step 2: Test Conflict Validation */}
          <div className="space-y-4">
            <h3 className="font-semibold">Step 2: Test Event Creation (Should Be Blocked)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventTitle">Event Title</Label>
                <Input
                  id="eventTitle"
                  value={eventData.title}
                  onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="eventDate">Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventData.date}
                  onChange={(e) => setEventData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="eventStartTime">Start Time</Label>
                <Input
                  id="eventStartTime"
                  type="time"
                  value={eventData.startTime}
                  onChange={(e) => setEventData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="eventEndTime">End Time</Label>
                <Input
                  id="eventEndTime"
                  type="time"
                  value={eventData.endTime}
                  onChange={(e) => setEventData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="eventParticipants">Participants</Label>
              <select
                id="eventParticipants"
                className="w-full p-2 border rounded"
                value={eventData.participants.join(',')}
                onChange={(e) => setEventData(prev => ({ 
                  ...prev, 
                  participants: e.target.value ? e.target.value.split(',').map(Number) : [] 
                }))}
              >
                <option value="">Select Participants</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={testConflictValidation} disabled={eventData.participants.length === 0}>
              Test Conflict Validation
            </Button>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button onClick={clearTestResults} variant="outline">
              Clear Test Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <Alert key={index} className={`${
                  result.type === 'success' ? 'border-green-500' : 
                  result.type === 'error' ? 'border-red-500' : 
                  'border-yellow-500'
                }`}>
                  <div className="flex items-start gap-2">
                    {result.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                    {result.type === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                    {result.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{result.action}</span>
                        <span className="text-sm text-gray-500">{result.timestamp}</span>
                      </div>
                      <AlertDescription>{result.message}</AlertDescription>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-gray-600">Show Details</summary>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}