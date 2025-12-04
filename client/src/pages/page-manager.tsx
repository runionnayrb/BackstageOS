import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Save, AlertTriangle, FileText, ChevronRight, Folder, File } from 'lucide-react';
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
  parent?: string;
  children?: Page[];
}

// Complete hierarchical page structure based on App.tsx routes
const ALL_APP_PAGES: Page[] = [
  // Main Routes
  {
    id: 'home',
    name: 'Projects Home',
    slug: '/',
    description: 'Main projects dashboard',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'projects',
    name: 'Projects',
    slug: '/projects',
    description: 'Project management page',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'projects-archived',
        name: 'Archived Projects',
        slug: '/projects/archived',
        description: 'View archived shows and projects',
        isSystem: true,
        parent: 'projects',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      }
    ]
  },
  {
    id: 'create-project',
    name: 'Create Project',
    slug: '/create-project',
    description: 'Create new project/show',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },

  // Show-specific Routes (dynamic :id)
  {
    id: 'shows',
    name: 'Show Management',
    slug: '/shows/:id',
    description: 'Individual show pages and management',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'show-detail',
        name: 'Show Details',
        slug: '/shows/:id',
        description: 'Show overview and main dashboard',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-reports',
        name: 'Reports',
        slug: '/shows/:id/reports',
        description: 'Show reports management',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'reports-list',
            name: 'Reports List',
            slug: '/shows/:id/reports/:type',
            description: 'View reports by type',
            isSystem: true,
            parent: 'show-reports',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          },
          {
            id: 'reports-builder',
            name: 'Report Builder',
            slug: '/shows/:id/reports/:type/builder',
            description: 'Build custom report templates',
            isSystem: true,
            parent: 'show-reports',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          },
          {
            id: 'new-report',
            name: 'New Report',
            slug: '/shows/:id/reports/:type/new',
            description: 'Create new report',
            isSystem: true,
            parent: 'show-reports',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          },
          {
            id: 'edit-report',
            name: 'Edit Report',
            slug: '/shows/:id/reports/:type/:reportId/edit',
            description: 'Edit existing report',
            isSystem: true,
            parent: 'show-reports',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          },
          {
            id: 'view-report',
            name: 'View Report',
            slug: '/shows/:id/reports/:type/:reportId',
            description: 'View report details',
            isSystem: true,
            parent: 'show-reports',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-calendar',
        name: 'Calendar',
        slug: '/shows/:id/calendar',
        description: 'Show calendar and scheduling',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'show-schedule',
            name: 'Schedule View',
            slug: '/shows/:id/calendar/schedule',
            description: 'Detailed schedule view',
            isSystem: true,
            parent: 'show-calendar',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-calls',
        name: 'Daily Calls',
        slug: '/shows/:id/calls',
        description: 'Daily call sheets',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'daily-call-sheet',
            name: 'Call Sheet',
            slug: '/shows/:id/calls/:date',
            description: 'Specific date call sheet',
            isSystem: true,
            parent: 'show-calls',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-script',
        name: 'Script Editor',
        slug: '/shows/:id/script',
        description: 'Script management and editing',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-props-costumes',
        name: 'Props & Costumes',
        slug: '/shows/:id/props-costumes',
        description: 'Props and costumes overview',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'show-props',
            name: 'Props Tracker',
            slug: '/shows/:id/props',
            description: 'Props tracking and management',
            isSystem: true,
            parent: 'show-props-costumes',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z',
            children: [
              {
                id: 'prop-detail',
                name: 'Prop Details',
                slug: '/shows/:id/props/:propId',
                description: 'Individual prop details',
                isSystem: true,
                parent: 'show-props',
                createdAt: '2025-06-30T00:00:00Z',
                updatedAt: '2025-06-30T00:00:00Z'
              }
            ]
          },
          {
            id: 'show-costumes',
            name: 'Costume Tracker',
            slug: '/shows/:id/costumes',
            description: 'Costume tracking and management',
            isSystem: true,
            parent: 'show-props-costumes',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-contacts',
        name: 'Contacts & Personnel',
        slug: '/shows/:id/contacts',
        description: 'Contact management',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'personnel-category',
            name: 'Personnel by Category',
            slug: '/shows/:id/contacts/:category',
            description: 'Personnel organized by category',
            isSystem: true,
            parent: 'show-contacts',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          },
          {
            id: 'contact-availability',
            name: 'Contact Availability',
            slug: '/shows/:id/contacts/:contactId/availability',
            description: 'Individual contact availability',
            isSystem: true,
            parent: 'show-contacts',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-performance',
        name: 'Performance Tracker',
        slug: '/shows/:id/performance-tracker',
        description: 'Performance tracking and analytics',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-tasks',
        name: 'Task Management',
        slug: '/shows/:id/tasks',
        description: 'Task management for show',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-notes',
        name: 'Notes',
        slug: '/shows/:id/notes',
        description: 'Show notes management',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'show-notes-tracking',
            name: 'Report Notes',
            slug: '/shows/:id/notes-tracking',
            description: 'Advanced notes tracking',
            isSystem: true,
            parent: 'show-notes',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-email-contacts',
        name: 'Email Contacts',
        slug: '/shows/:id/email-contacts',
        description: 'Email contact management',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-schedule-mapping',
        name: 'Schedule Mapping',
        slug: '/shows/:id/schedule-mapping',
        description: 'Schedule relationship mapping',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-theater-email',
        name: 'Theater Email',
        slug: '/shows/:showId/theater-email',
        description: 'Theater email management',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-templates',
        name: 'Templates',
        slug: '/shows/:id/templates',
        description: 'Show-specific templates',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'new-template',
            name: 'New Template',
            slug: '/shows/:id/templates/new',
            description: 'Create new template',
            isSystem: true,
            parent: 'show-templates',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          },
          {
            id: 'edit-template',
            name: 'Edit Template',
            slug: '/shows/:id/templates/:templateId/edit',
            description: 'Edit existing template',
            isSystem: true,
            parent: 'show-templates',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-templates-v2',
        name: 'Templates V2',
        slug: '/shows/:id/templates-v2',
        description: 'Next-gen template editor',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'edit-template-v2',
            name: 'Edit Template V2',
            slug: '/shows/:id/templates-v2/:templateId/edit',
            description: 'Edit template using v2 editor',
            isSystem: true,
            parent: 'show-templates-v2',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      },
      {
        id: 'show-global-templates',
        name: 'Global Template Settings',
        slug: '/shows/:id/global-template-settings',
        description: 'Global template configuration',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'show-settings',
        name: 'Show Settings',
        slug: '/shows/:id/settings',
        description: 'Show-specific settings',
        isSystem: true,
        parent: 'shows',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      }
    ]
  },

  // Global Pages
  {
    id: 'global-tasks',
    name: 'Global Tasks',
    slug: '/tasks',
    description: 'Global task management',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'global-notes',
    name: 'Global Notes',
    slug: '/notes',
    description: 'Global notes management',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'settings',
    name: 'Settings',
    slug: '/settings',
    description: 'Application settings',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'profile',
    name: 'Profile Settings',
    slug: '/profile',
    description: 'User profile management',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'feedback',
    name: 'Feedback',
    slug: '/feedback',
    description: 'User feedback page',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },

  // Authentication & Access
  {
    id: 'auth',
    name: 'Authentication',
    slug: '/auth',
    description: 'Login and authentication',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'login',
    name: 'Login',
    slug: '/login',
    description: 'Alternative login route',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'password-recovery',
    name: 'Password Recovery',
    slug: '/forgot-password',
    description: 'Password reset request',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'reset-password',
    name: 'Reset Password',
    slug: '/reset-password',
    description: 'Password reset form',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },

  // Admin Routes
  {
    id: 'admin',
    name: 'Admin Dashboard',
    slug: '/admin',
    description: 'Main admin dashboard',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'admin-user-roles',
        name: 'User Roles',
        slug: '/admin/user-roles',
        description: 'User role management',
        isSystem: true,
        parent: 'admin',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'admin-pages',
        name: 'Page Manager',
        slug: '/admin/pages',
        description: 'Page management and routing',
        isSystem: true,
        parent: 'admin',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'admin-dns',
        name: 'DNS Manager',
        slug: '/admin/dns',
        description: 'DNS and domain management',
        isSystem: true,
        parent: 'admin',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'admin-domains',
        name: 'Domain Manager',
        slug: '/admin/domains',
        description: 'Domain routing configuration',
        isSystem: true,
        parent: 'admin',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'admin-seo',
        name: 'SEO Manager',
        slug: '/admin/seo',
        description: 'SEO settings and optimization',
        isSystem: true,
        parent: 'admin',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      }
    ]
  },

  // Email & Communication
  {
    id: 'email-tools',
    name: 'Email Tools',
    slug: '/email',
    description: 'Email management tools',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'email-manager',
        name: 'Email Manager',
        slug: '/email-manager',
        description: 'Advanced email management',
        isSystem: true,
        parent: 'email-tools',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'email-contacts-global',
        name: 'Email Contacts',
        slug: '/email-contacts',
        description: 'Global email contacts',
        isSystem: true,
        parent: 'email-tools',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'email-setup',
        name: 'Email Setup',
        slug: '/email-setup',
        description: 'Email setup and configuration',
        isSystem: true,
        parent: 'email-tools',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z',
        children: [
          {
            id: 'apple-mail-setup',
            name: 'Apple Mail Setup',
            slug: '/email-setup/apple-mail',
            description: 'Setup instructions for Apple Mail',
            isSystem: true,
            parent: 'email-setup',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          },
          {
            id: 'email-forwarding-setup',
            name: 'Email Forwarding Setup',
            slug: '/email-setup/forwarding',
            description: 'Setup email forwarding',
            isSystem: true,
            parent: 'email-setup',
            createdAt: '2025-06-30T00:00:00Z',
            updatedAt: '2025-06-30T00:00:00Z'
          }
        ]
      }
    ]
  },

  // Tools & Utilities
  {
    id: 'tools',
    name: 'Tools',
    slug: '/tools',
    description: 'General purpose tools',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'chat',
    name: 'Chat',
    slug: '/chat',
    description: 'Communication and chat',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },

  // Analytics & Dashboards
  {
    id: 'auto-resolution',
    name: 'Auto Resolution Dashboard',
    slug: '/auto-resolution-dashboard',
    description: 'Automated resolution tracking',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },
  {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    slug: '/advanced-analytics-dashboard',
    description: 'Advanced analytics and reporting',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z'
  },

  // Billing & Subscriptions
  {
    id: 'billing-management',
    name: 'Billing & Subscriptions',
    slug: '/billing',
    description: 'Billing and subscription management',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'checkout',
        name: 'Checkout',
        slug: '/checkout',
        description: 'Payment checkout process',
        isSystem: true,
        parent: 'billing-management',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'subscribe',
        name: 'Subscribe',
        slug: '/subscribe',
        description: 'Subscription signup',
        isSystem: true,
        parent: 'billing-management',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      }
    ]
  },

  // Policy Pages
  {
    id: 'policies',
    name: 'Policy Pages',
    slug: '/policy',
    description: 'Legal and policy pages',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'security',
        name: 'Security Policy',
        slug: '/security',
        description: 'Security and privacy policy',
        isSystem: true,
        parent: 'policies',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'privacy',
        name: 'Privacy Policy',
        slug: '/privacy',
        description: 'Privacy policy page',
        isSystem: true,
        parent: 'policies',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'terms',
        name: 'Terms of Service',
        slug: '/terms',
        description: 'Terms of service',
        isSystem: true,
        parent: 'policies',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      }
    ]
  },

  // Test & Development Pages
  {
    id: 'development-tools',
    name: 'Development Tools',
    slug: '/test-*',
    description: 'Development and testing tools',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'test-notes',
        name: 'Test Notes',
        slug: '/test-notes',
        description: 'Testing notes functionality',
        isSystem: true,
        parent: 'development-tools',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'test-image-upload',
        name: 'Test Image Upload',
        slug: '/test-image-upload',
        description: 'Testing image upload functionality',
        isSystem: true,
        parent: 'development-tools',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'navigation-demo',
        name: 'Navigation Demo',
        slug: '/navigation-demo',
        description: 'Navigation component demonstration',
        isSystem: true,
        parent: 'development-tools',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'seo-test',
        name: 'SEO Test',
        slug: '/seo-test',
        description: 'SEO testing utilities',
        isSystem: true,
        parent: 'development-tools',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      }
    ]
  },

  // Public Access Routes
  {
    id: 'public-access',
    name: 'Public Access',
    slug: '/public-*',
    description: 'Public access pages (no auth required)',
    isSystem: true,
    createdAt: '2025-06-30T00:00:00Z',
    updatedAt: '2025-06-30T00:00:00Z',
    children: [
      {
        id: 'personal-schedule',
        name: 'Personal Schedule',
        slug: '/personal-schedule/:token',
        description: 'Public personal schedule viewer',
        isSystem: true,
        parent: 'public-access',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'public-calendar',
        name: 'Public Calendar',
        slug: '/public-calendar/:token',
        description: 'Public calendar viewer',
        isSystem: true,
        parent: 'public-access',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      },
      {
        id: 'public-event-calendar',
        name: 'Public Event Calendar',
        slug: '/public-calendar/event-type/:type',
        description: 'Public event type calendar',
        isSystem: true,
        parent: 'public-access',
        createdAt: '2025-06-30T00:00:00Z',
        updatedAt: '2025-06-30T00:00:00Z'
      }
    ]
  }
];

const SYSTEM_PAGES = ALL_APP_PAGES;

// Helper function to render a single page item in hierarchical structure
const PageItem = ({ 
  page, 
  level = 0, 
  onUpdateURL, 
  onDelete,
  collapsedState,
  onToggleCollapse
}: { 
  page: Page; 
  level?: number; 
  onUpdateURL: (pageId: string, newSlug: string) => void;
  onDelete: (pageId: string) => void;
  collapsedState: Record<string, boolean>;
  onToggleCollapse: (pageId: string) => void;
}) => {
  const hasChildren = page.children && page.children.length > 0;
  const isCollapsed = collapsedState?.[page.id] ?? true; // Default to collapsed
  
  return (
    <div className="space-y-1">
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between py-2 border-l-2 border-gray-200 pl-4 ${level > 0 ? 'ml-6 border-gray-300' : ''}`}>
        <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4 flex-1">
          <div className="flex items-center space-x-2 flex-1">
            <div className="flex items-center space-x-1">
              {hasChildren && (
                <button
                  onClick={() => onToggleCollapse(page.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                </button>
              )}
              {hasChildren ? (
                <Folder className="h-4 w-4 text-blue-500" />
              ) : (
                <File className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-sm lg:text-base">
                  {page.name}
                </span>
                <div className="text-xs lg:text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                  {page.slug}
                </div>
              </div>
              <Badge variant="outline" className="text-xs text-purple-600 border-transparent bg-transparent ml-auto">
                System
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* Render children recursively when not collapsed */}
      {hasChildren && !isCollapsed && page.children!.map((child) => (
        <PageItem
          key={child.id}
          page={child}
          level={level + 1}
          onUpdateURL={onUpdateURL}
          onDelete={onDelete}
          collapsedState={collapsedState}
          onToggleCollapse={onToggleCollapse}
        />
      ))}
    </div>
  );
};

export default function PageManager() {
  const [pages, setPages] = useState<Page[]>(SYSTEM_PAGES);
  const [editedPages, setEditedPages] = useState<Page[]>(SYSTEM_PAGES);
  const [hasChanges, setHasChanges] = useState(false);
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});
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

  const toggleCollapse = (pageId: string) => {
    setCollapsedState(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
    }));
  };

  // Load pages from localStorage on mount
  useEffect(() => {
    // First try to load comprehensive pages data (includes system page URL changes)
    const savedAllPages = localStorage.getItem('backstage-all-pages');
    if (savedAllPages) {
      try {
        const allPagesData = JSON.parse(savedAllPages);
        console.log('Loaded all pages from localStorage:', allPagesData);
        setPages(allPagesData);
        setEditedPages(allPagesData);
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
    // Don't auto-prepend slash while typing - let user type freely
    const updatedPages = editedPages.map(p => 
      p.id === pageId 
        ? { ...p, slug: newSlug, updatedAt: new Date().toISOString() }
        : p
    );
    
    console.log(`Updated page ${pageId} slug to: ${newSlug}`);
    console.log('All updated pages:', updatedPages);
    
    setEditedPages(updatedPages);
    setHasChanges(true);
  };

  const saveAllChanges = () => {
    // Ensure URLs start with / before saving
    const pagesWithValidUrls = editedPages.map(p => ({
      ...p,
      slug: p.slug.startsWith('/') ? p.slug : '/' + p.slug
    }));
    
    const customPages = pagesWithValidUrls.filter(p => !p.isSystem);
    localStorage.setItem('backstage-pages', JSON.stringify(customPages));
    
    // Also save system pages with their updated URLs
    const allPagesData = pagesWithValidUrls.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      isSystem: p.isSystem,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    
    localStorage.setItem('backstage-all-pages', JSON.stringify(allPagesData));
    console.log('Saved all pages to localStorage:', allPagesData);
    
    // Update both states with validated URLs
    setPages(pagesWithValidUrls);
    setEditedPages(pagesWithValidUrls);
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
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      {/* Mobile-responsive header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8 space-y-4 lg:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
          <Link to="/admin/dns">
            <Button variant="ghost" size="default" className="w-full sm:w-auto justify-start">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to DNS Manager
            </Button>
          </Link>
          <div>
            <h1 className="hidden md:block text-2xl lg:text-3xl font-bold">Page Manager</h1>
            <p className="text-sm lg:text-base text-gray-600">View all application pages in hierarchical structure</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full lg:w-auto" size="default">
          <Plus className="mr-2 h-4 w-4" />
          <span className="sm:inline">Create Page</span>
        </Button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Pages List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <CardTitle>Application Page Hierarchy</CardTitle>
              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <Button onClick={saveAllChanges} className="w-full sm:w-auto">
                    <Save className="mr-2 h-4 w-4" />
                    <span className="sm:inline">Save All Changes</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Display only top-level pages - children are rendered recursively */}
              {editedPages
                .filter(page => !page.parent) // Only show root-level pages
                .map((page) => (
                  <PageItem
                    key={page.id}
                    page={page}
                    level={0}
                    onUpdateURL={updateURL}
                    onDelete={deletePage}
                    collapsedState={collapsedState}
                    onToggleCollapse={toggleCollapse}
                  />
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
            <CardTitle className="text-lg">Application Page Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <h4 className="font-medium text-sm mb-3">Hierarchical Organization</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span>Parent pages with sub-pages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-gray-500" />
                    <span>Individual pages and endpoints</span>
                  </div>
                  <div className="text-xs text-gray-600 ml-6">
                    • Indentation shows page relationships<br/>
                    • Page title and slug displayed on same line<br/>
                    • Dynamic routes use :id, :type parameters
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-3">Page Categories</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Show Management:</strong> Production-specific pages</div>
                  <div><strong>Admin:</strong> System administration tools</div>
                  <div><strong>Global:</strong> Cross-project functionality</div>
                  <div><strong>Public:</strong> No authentication required</div>
                  <div><strong>Tools:</strong> Utility and communication features</div>
                  <div><strong>Development:</strong> Testing and demo pages</div>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500">
                This view shows all routes defined in the application. System pages are managed automatically based on the routing configuration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Page Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-md">
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
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="new-slug">URL Slug</Label>
              <Input
                id="new-slug"
                value={newPage.slug || ''}
                onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                placeholder="e.g., /about-us"
                className="w-full"
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
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={createPage} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent className="w-[95vw] max-w-md">
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
          <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={cancelDelete} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}