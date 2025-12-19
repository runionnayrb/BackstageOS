import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Globe, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function DNSRecordsDirect() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'CNAME',
    value: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch DNS records
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['/api/dns-records'],
    enabled: false // Don't auto-fetch since we mainly want to create records
  });

  // Mutation to create DNS record
  const createRecordMutation = useMutation({
    mutationFn: async (recordData: typeof formData) => {
      const response = await fetch('/api/dns-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create DNS record');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DNS record created successfully"
      });
      
      // Clear form
      setFormData({ name: '', type: 'CNAME', value: '' });
      
      // Invalidate records cache if needed
      queryClient.invalidateQueries({ queryKey: ['/api/dns-records'] });
    },
    onError: (error: any) => {
      console.error('DNS record creation error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create DNS record',
        variant: "destructive"
      });
    }
  });

  const createRecord = () => {
    if (!formData.type || !formData.value) {
      toast({
        title: "Error",
        description: "Type and value are required",
        variant: "destructive"
      });
      return;
    }

    createRecordMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/domain-management">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Domain Management
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Globe className="h-8 w-8" />
          DNS Records Management
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Direct API v3.0</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Create and manage DNS records for backstageos.com
        </p>
      </div>

      <div className="grid gap-6">
        {/* Create DNS Record Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create DNS Record
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Name (subdomain)</Label>
                <Input
                  id="name"
                  placeholder="@ for root domain"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty or use @ for root domain
                </p>
              </div>

              <div>
                <Label htmlFor="type">Record Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNAME">CNAME</SelectItem>
                    <SelectItem value="A">A Record</SelectItem>
                    <SelectItem value="AAAA">AAAA</SelectItem>
                    <SelectItem value="TXT">TXT</SelectItem>
                    <SelectItem value="MX">MX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value">Points To</Label>
                <Input
                  id="value"
                  placeholder="e.g., your-app.replit.app"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your Replit app domain
                </p>
              </div>
            </div>

            <Button 
              onClick={createRecord} 
              disabled={createRecordMutation.isPending || !formData.type || !formData.value}
              className="w-full md:w-auto"
            >
              {createRecordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create DNS Record'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">To point backstageos.com to your Replit app:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Name: Leave empty or use @</li>
                  <li>• Type: CNAME</li>
                  <li>• Points To: {window.location.hostname}</li>
                </ul>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">Current Replit Domain:</h4>
                <code className="text-sm text-green-800 bg-green-100 px-2 py-1 rounded">
                  {window.location.hostname}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}