// In-memory storage for beta settings until database schema is properly deployed
interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'implemented' | 'in-progress' | 'planned';
  enabled: boolean;
}

interface BetaSettingsData {
  features: FeatureConfig[];
  updatedBy?: number;
  updatedAt?: Date;
}

// Default feature configuration organized by current implementation status
const DEFAULT_FEATURES: FeatureConfig[] = [
  // Core Production Tools - Implemented
  {
    id: 'script-editor',
    name: 'Script Editor',
    description: 'Advanced script editing with cue building and visual overlays',
    category: 'Production Tools',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'props-tracker',
    name: 'Props Tracker',
    description: 'Scene/character organization and status tracking for props',
    category: 'Production Tools',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'costume-tracker',
    name: 'Costume Tracker',
    description: 'Quick-change timing and repair tracking for costumes',
    category: 'Production Tools',
    status: 'implemented',
    enabled: true,
  },
  
  // Planning & Scheduling - Implemented
  {
    id: 'calendar-management',
    name: 'Calendar Management',
    description: 'Advanced scheduling and calendar features with Google Calendar integration',
    category: 'Planning & Scheduling',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'contact-management',
    name: 'Contact Management',
    description: 'Complete contact system with availability tracking and cast organization',
    category: 'Team Management',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'availability-management',
    name: 'Availability Management',
    description: 'Visual drag-and-drop scheduling system for contact availability',
    category: 'Planning & Scheduling',
    status: 'implemented',
    enabled: true,
  },
  
  // Reports & Templates - Implemented
  {
    id: 'advanced-templates',
    name: 'Advanced Templates',
    description: 'Custom field types and dynamic template configuration',
    category: 'Reports & Templates',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'report-builder',
    name: 'Report Builder',
    description: 'Flexible report creation with custom layouts and formatting',
    category: 'Reports & Templates',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'document-templates',
    name: 'Document Templates',
    description: 'Upload custom Word templates for exporting running orders, reports, and other documents',
    category: 'Reports & Templates',
    status: 'implemented',
    enabled: true,
  },
  
  // Team Management - Implemented
  {
    id: 'team-management',
    name: 'Team Management',
    description: 'Team member permissions and project collaboration tools',
    category: 'Team Management',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'email-integration',
    name: 'Email Integration',
    description: 'Professional email routing and communication features',
    category: 'Communication',
    status: 'implemented',
    enabled: true,
  },
  
  // Admin & Analytics - Implemented
  {
    id: 'admin-dashboard',
    name: 'Admin Dashboard',
    description: 'Complete user management and system administration',
    category: 'Administration',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'error-logging',
    name: 'Error Logging & Analytics',
    description: 'Production error tracking with AI-powered analysis and resolution',
    category: 'Administration',
    status: 'implemented',
    enabled: true,
  },
  {
    id: 'feedback-system',
    name: 'Feedback System',
    description: 'Built-in user feedback with categorization and admin management',
    category: 'Administration',
    status: 'implemented',
    enabled: true,
  },
  
  // In Progress Features
  {
    id: 'task-boards',
    name: 'Task Boards',
    description: 'Kanban-style task management and workflow tracking',
    category: 'Planning & Scheduling',
    status: 'in-progress',
    enabled: false,
  },
  {
    id: 'advanced-notes',
    name: 'Advanced Notes System',
    description: 'Rich text notes with attachments and collaboration features',
    category: 'Production Tools',
    status: 'in-progress',
    enabled: false,
  },
  {
    id: 'performance-tracker',
    name: 'Performance Tracker',
    description: 'Track show performance metrics and audience feedback',
    category: 'Production Tools',
    status: 'in-progress',
    enabled: false,
  },
  
  // Planned Features
  {
    id: 'cast-management',
    name: 'Cast Management',
    description: 'Character breakdowns and cast tracking tools with understudy management',
    category: 'Production Tools',
    status: 'planned',
    enabled: false,
  },
  {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    description: 'Comprehensive production analytics and insights dashboard',
    category: 'Analytics',
    status: 'planned',
    enabled: false,
  },
  {
    id: 'mobile-app',
    name: 'Mobile App Integration',
    description: 'Native mobile app with offline capabilities',
    category: 'Integration',
    status: 'planned',
    enabled: false,
  },
  {
    id: 'workflow-automation',
    name: 'Workflow Automation',
    description: 'Automated workflows and smart notifications',
    category: 'Automation',
    status: 'planned',
    enabled: false,
  },
];

class BetaSettingsStore {
  private settings: BetaSettingsData = {
    features: DEFAULT_FEATURES
  };

  getBetaSettings(): BetaSettingsData {
    return this.settings;
  }

  updateBetaSettings(newSettings: BetaSettingsData): BetaSettingsData {
    this.settings = {
      ...newSettings,
      updatedAt: new Date()
    };
    return this.settings;
  }
}

export const betaSettingsStore = new BetaSettingsStore();