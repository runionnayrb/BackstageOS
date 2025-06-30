import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Globe, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function DNSManager() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CNAME',
    value: ''
  });
  const { toast } = useToast();

  const createRecord = async () => {
    if (!formData.type || !formData.value) {
      toast({
        title: "Error",
        description: "Type and value are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/dns-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create DNS record');
      }

      const result = await response.json();
      
      toast({
        title: "Success", 
        description: "DNS record created successfully"
      });

      // Clear form
      setFormData({ name: '', type: 'CNAME', value: '' });
      
    } catch (error: any) {
      console.error('DNS record creation error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create DNS record',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Globe className="h-8 w-8" />
                DNS Manager
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Direct API</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Create DNS records for backstageos.com
              </p>
            </div>
            <Link href="/domain-management">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Domain Management
              </Button>
            </Link>
          </div>
        </div>

        {/* DNS Record Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create DNS Record</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add a new DNS record to backstageos.com domain
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="record-name">Record Name (optional)</Label>
                <Input
                  id="record-name"
                  placeholder="@ (for root domain)"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for root domain (backstageos.com)
                </p>
              </div>

              <div>
                <Label htmlFor="record-type">Record Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNAME">CNAME</SelectItem>
                    <SelectItem value="A">A Record</SelectItem>
                    <SelectItem value="AAAA">AAAA Record</SelectItem>
                    <SelectItem value="TXT">TXT Record</SelectItem>
                    <SelectItem value="MX">MX Record</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="record-value">Target Value</Label>
                <Input
                  id="record-value"
                  placeholder="your-app.replit.dev"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Where this record should point to
                </p>
              </div>
            </div>

            {/* Quick Setup Suggestions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Quick Setup for Replit App:</h3>
              <div className="space-y-2 text-sm">
                <p className="text-blue-800">
                  <strong>Name:</strong> Leave empty (for backstageos.com) <br />
                  <strong>Type:</strong> CNAME <br />
                  <strong>Value:</strong> 54b2a03e-f6bc-4ffb-98e0-199af055748d-00-2qsoy9oww05fb.spock.replit.dev
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFormData({
                    name: '',
                    type: 'CNAME',
                    value: '54b2a03e-f6bc-4ffb-98e0-199af055748d-00-2qsoy9oww05fb.spock.replit.dev'
                  })}
                >
                  Use This Setup
                </Button>
              </div>
            </div>

            <Button 
              onClick={createRecord} 
              disabled={loading || !formData.type || !formData.value}
              className="w-full md:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating DNS Record...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create DNS Record
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>DNS Management Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium">Zone ID:</h4>
                <p className="text-muted-foreground">9cb18bcfe89740bffc69765c29779551</p>
              </div>
              <div>
                <h4 className="font-medium">Domain:</h4>
                <p className="text-muted-foreground">backstageos.com</p>
              </div>
              <div>
                <h4 className="font-medium">Provider:</h4>
                <p className="text-muted-foreground">Cloudflare</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}