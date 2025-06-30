import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Save, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface Page {
  id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const SYSTEM_PAGES: Page[] = [
  {
    id: 'home',
    name: 'App Home',
    slug: '/',
    description: 'Main theater management application',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'landing',
    name: 'Landing Page',
    slug: '/landing',
    description: 'Public landing/waitlist page',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'auth',
    name: 'Sign In',
    slug: '/auth',
    description: 'Authentication page',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'admin',
    name: 'Admin Dashboard',
    slug: '/admin',
    description: 'Admin panel (requires admin access)',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  }
];

export default function PageManager() {
  const [pages, setPages] = useState<Page[]>(SYSTEM_PAGES);
  const [editedPages, setEditedPages] = useState<Page[]>(SYSTEM_PAGES);
  const [hasChanges, setHasChanges] = useState(false);
  const [newPage, setNewPage] = useState<Partial<Page>>({
    name: '',
    slug: '',
    description: '',
    isSystem: false
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    pageId: string;
    pageName: string;
  }>({ isOpen: false, pageId: '', pageName: '' });
  const { toast } = useToast();

  // Load pages from localStorage on mount
  useEffect(() => {
    const savedPages = localStorage.getItem('backstage-pages');
    if (savedPages) {
      try {
        const parsed = JSON.parse(savedPages);
        const allPages = [...SYSTEM_PAGES, ...parsed.filter((p: Page) => !p.isSystem)];
        setPages(allPages);
        setEditedPages(allPages);
      } catch (error) {
        console.error('Failed to load pages:', error);
      }
    }
  }, []);

  // Save pages to localStorage
  const savePages = (updatedPages: Page[]) => {
    const customPages = updatedPages.filter(p => !p.isSystem);
    localStorage.setItem('backstage-pages', JSON.stringify(customPages));
    setPages(updatedPages);
  };

  const updateURL = (pageId: string, newSlug: string) => {
    if (!newSlug.startsWith('/')) {
      newSlug = '/' + newSlug;
    }
    
    const updatedPages = editedPages.map(p => 
      p.id === pageId 
        ? { ...p, slug: newSlug, updatedAt: new Date().toISOString() }
        : p
    );
    
    setEditedPages(updatedPages);
    setHasChanges(true);
  };

  const saveAllChanges = () => {
    const customPages = editedPages.filter(p => !p.isSystem);
    localStorage.setItem('backstage-pages', JSON.stringify(customPages));
    setPages(editedPages);
    setHasChanges(false);
    toast({ title: "All URL settings saved successfully" });
  };

  const createPage = () => {
    if (!newPage.name?.trim() || !newPage.slug?.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    let slug = newPage.slug.trim();
    if (!slug.startsWith('/')) {
      slug = '/' + slug;
    }

    // Check for duplicate slugs
    if (pages.some(p => p.slug === slug)) {
      toast({ title: "A page with this URL already exists", variant: "destructive" });
      return;
    }

    const page: Page = {
      id: Date.now().toString(),
      name: newPage.name.trim(),
      slug,
      description: newPage.description?.trim() || '',
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedPages = [...pages, page];
    savePages(updatedPages);
    setNewPage({ name: '', slug: '', description: '', isSystem: false });
    setShowCreateDialog(false);
    toast({ title: "Page created successfully" });
  };

  const deletePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    if (page.isSystem) {
      toast({ title: "Cannot delete system pages", variant: "destructive" });
      return;
    }

    setDeleteConfirmation({
      isOpen: true,
      pageId,
      pageName: page.name
    });
  };

  const confirmDelete = () => {
    const { pageId } = deleteConfirmation;
    const updatedPages = pages.filter(p => p.id !== pageId);
    savePages(updatedPages);
    setDeleteConfirmation({ isOpen: false, pageId: '', pageName: '' });
    toast({ title: "Page deleted successfully" });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, pageId: '', pageName: '' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/admin/dns">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to DNS Manager
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Page Manager</h1>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Page
        </Button>
      </div>

      <div className="space-y-6">
        {/* Pages List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Page URL Settings</CardTitle>
              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <Button onClick={saveAllChanges}>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Changes
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editedPages.map((page) => (
                <div key={page.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{page.name}</span>
                    <Badge variant={page.isSystem ? "secondary" : "outline"} className="text-xs">
                      {page.isSystem ? "System" : "Custom"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={page.slug}
                      onChange={(e) => updateURL(page.id, e.target.value)}
                      placeholder="/page-url"
                      className="w-64"
                      disabled={page.isSystem}
                    />
                    {!page.isSystem && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setDeleteConfirmation({ 
                          isOpen: true, 
                          pageId: page.id, 
                          pageName: page.name 
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {editedPages.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No pages configured. Click "Create Page" to create your first page.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How Page Management Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Page Types</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">System</Badge>
                    <span>Built-in pages that cannot be modified</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Custom</Badge>
                    <span>Pages you create and can edit or delete</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">URL Rules</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>• URLs must start with / (automatically added)</div>
                  <div>• Each URL must be unique across all pages</div>
                  <div>• Use lowercase and hyphens for readability</div>
                  <div>• Pages created here appear in Domain Manager</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Page Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-name">Page Name</Label>
              <Input
                id="new-name"
                value={newPage.name || ''}
                onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                placeholder="e.g., About Us"
              />
            </div>
            <div>
              <Label htmlFor="new-slug">URL Slug</Label>
              <Input
                id="new-slug"
                value={newPage.slug || ''}
                onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                placeholder="e.g., /about-us"
              />
            </div>
            <div>
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newPage.description || ''}
                onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
                placeholder="Brief description of this page"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createPage}>
              <Plus className="mr-2 h-4 w-4" />
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Are you sure you want to delete the page{' '}
              <strong className="text-gray-900">{deleteConfirmation.pageName}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. Any domain routes pointing to this page will need to be updated.
            </p>
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}