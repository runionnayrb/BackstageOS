import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Save, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';

interface DomainRoute {
  domain: string;
  route: string;
  description: string;
  type: 'public' | 'auth_required' | 'landing';
}

const DEFAULT_ROUTES: DomainRoute[] = [
  { domain: 'backstageos.com', route: '/landing', description: 'Main landing page for new visitors', type: 'landing' },
  { domain: 'beta.backstageos.com', route: '/', description: 'Beta app home (requires authentication)', type: 'auth_required' },
  { domain: 'app.backstageos.com', route: '/', description: 'Main app home (requires authentication)', type: 'auth_required' },
  { domain: 'join.backstageos.com', route: '/landing', description: 'Waitlist signup page', type: 'public' }
];

interface Page {
  id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
}

const SYSTEM_PAGES: Page[] = [
  { id: 'home', name: 'App Home', slug: '/', description: 'Main theater management application', isSystem: true },
  { id: 'landing', name: 'Landing Page', slug: '/landing', description: 'Public landing/waitlist page', isSystem: true },
  { id: 'auth', name: 'Sign In', slug: '/auth', description: 'Authentication page', isSystem: true },
  { id: 'admin', name: 'Admin Dashboard', slug: '/admin', description: 'Admin panel (requires admin access)', isSystem: true }
];

export default function DomainManager() {
  const [routes, setRoutes] = useState<DomainRoute[]>(DEFAULT_ROUTES);
  const [pages, setPages] = useState<Page[]>(SYSTEM_PAGES);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    routeIndex: number;
    routeDomain: string;
  }>({ isOpen: false, routeIndex: -1, routeDomain: '' });
  const { toast } = useToast();

  // Load pages from localStorage on mount
  useEffect(() => {
    // First try to load comprehensive pages data (includes system page URL changes)
    const savedAllPages = localStorage.getItem('backstage-all-pages');
    if (savedAllPages) {
      try {
        const allPagesData = JSON.parse(savedAllPages);
        console.log('Domain Manager loaded all pages from localStorage:', allPagesData);
        setPages(allPagesData);
        return;
      } catch (error) {
        console.error('Failed to load comprehensive pages:', error);
      }
    }
    
    // Fallback to loading custom pages only
    const savedPages = localStorage.getItem('backstage-pages');
    if (savedPages) {
      try {
        const parsed = JSON.parse(savedPages);
        setPages([...SYSTEM_PAGES, ...parsed.filter((p: Page) => !p.isSystem)]);
      } catch (error) {
        console.error('Failed to load pages:', error);
      }
    }
  }, []);

  const handleSave = () => {
    // In a real implementation, this would save to the server
    toast({
      title: "Domain Routes Updated",
      description: "Domain routing configuration has been saved successfully."
    });
    setIsEditing(false);
  };

  const addDomain = () => {
    const newRoute: DomainRoute = {
      domain: '',
      route: '/',
      description: '',
      type: 'auth_required'
    };
    setRoutes([...routes, newRoute]);
    setIsEditing(true);
  };

  const updateRoute = (index: number, field: keyof DomainRoute, value: string) => {
    const updatedRoutes = [...routes];
    updatedRoutes[index] = { ...updatedRoutes[index], [field]: value };
    setRoutes(updatedRoutes);
    setIsEditing(true);
  };

  const removeRoute = (index: number) => {
    const route = routes[index];
    setDeleteConfirmation({
      isOpen: true,
      routeIndex: index,
      routeDomain: route.domain
    });
  };

  const confirmDelete = () => {
    const { routeIndex } = deleteConfirmation;
    setRoutes(routes.filter((_, i) => i !== routeIndex));
    setIsEditing(true);
    setDeleteConfirmation({ isOpen: false, routeIndex: -1, routeDomain: '' });
    toast({ title: "Domain route deleted successfully" });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, routeIndex: -1, routeDomain: '' });
  };

  const getRouteTypeColor = (type: string) => {
    switch (type) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'auth_required': return 'bg-blue-100 text-blue-800';
      case 'landing': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-6xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 w-full lg:w-auto">
          <Link to="/admin/dns">
            <Button variant="ghost" size="default" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to DNS Manager
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Domain Manager</h1>
            <p className="text-sm lg:text-base text-gray-600">Configure domain routing and page assignments</p>
          </div>
        </div>
        <Link to="/admin/pages" className="w-full lg:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" size="default">
            <FileText className="mr-2 h-4 w-4" />
            Page Manager
          </Button>
        </Link>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800 text-sm sm:text-base">Domain Routing Configuration</h3>
            <p className="text-xs sm:text-sm text-amber-700 mt-1">
              Configure which page loads when visitors access your domains. Changes require a server restart to take effect.
            </p>
            <p className="text-xs text-amber-600 mt-2">
              <strong>Note:</strong> Make sure your DNS records point to the correct Replit infrastructure before configuring routing.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Domain Routes</CardTitle>
          <div className="flex space-x-2">
            <Button onClick={addDomain} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
            {isEditing && (
              <Button onClick={handleSave} size="sm" variant="default">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routes.map((route, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                  {/* Domain */}
                  <div className="lg:col-span-2">
                    <Label htmlFor={`domain-${index}`} className="text-sm font-medium">
                      Domain
                    </Label>
                    <Input
                      id={`domain-${index}`}
                      value={route.domain}
                      onChange={(e) => updateRoute(index, 'domain', e.target.value)}
                      placeholder="example.backstageos.com"
                      className="mt-1"
                    />
                  </div>

                  {/* Route */}
                  <div>
                    <Label htmlFor={`route-${index}`} className="text-sm font-medium">
                      Page Route
                    </Label>
                    <Select 
                      value={route.route} 
                      onValueChange={(value) => updateRoute(index, 'route', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pages.map((page) => (
                          <SelectItem key={page.slug} value={page.slug}>
                            <div>
                              <div className="font-medium">{page.name}</div>
                              <div className="text-xs text-gray-500">{page.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type */}
                  <div>
                    <Label htmlFor={`type-${index}`} className="text-sm font-medium">
                      Access Type
                    </Label>
                    <Select 
                      value={route.type} 
                      onValueChange={(value) => updateRoute(index, 'type', value as DomainRoute['type'])}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div>
                            <div className="font-medium">Public</div>
                            <div className="text-xs text-gray-500">Anyone can access</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="auth_required">
                          <div>
                            <div className="font-medium">Auth Required</div>
                            <div className="text-xs text-gray-500">Must be logged in</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="landing">
                          <div>
                            <div className="font-medium">Landing Page</div>
                            <div className="text-xs text-gray-500">Marketing/signup page</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor={`description-${index}`} className="text-sm font-medium">
                      Description
                    </Label>
                    <Input
                      id={`description-${index}`}
                      value={route.description}
                      onChange={(e) => updateRoute(index, 'description', e.target.value)}
                      placeholder="Brief description"
                      className="mt-1"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-end justify-end space-x-2">
                    <Badge className={getRouteTypeColor(route.type)}>
                      {route.type.replace('_', ' ')}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeRoute(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-600">
                    <strong>Preview:</strong> {route.domain || '[domain]'} → {route.route || '[route]'}
                  </div>
                </div>
              </div>
            ))}

            {routes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No domain routes configured.</p>
                <p className="text-sm mt-1">Click "Add Domain" to create your first route.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How Domain Routing Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Route Types</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">Public</Badge>
                    <span>Anyone can access, no login required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-blue-100 text-blue-800">Auth Required</Badge>
                    <span>Must be logged in to access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-100 text-purple-800">Landing</Badge>
                    <span>Marketing/signup page for new visitors</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Available Pages</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>/</strong> - Main app home (theater management)</div>
                  <div><strong>/landing</strong> - Public landing/waitlist page</div>
                  <div><strong>/auth</strong> - Login/signup page</div>
                  <div><strong>/admin</strong> - Admin dashboard</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Confirm Deletion</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete the domain route for{' '}
              <strong className="text-gray-900">{deleteConfirmation.routeDomain}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. The domain will no longer route to any page.
            </p>
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}