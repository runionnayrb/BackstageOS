// In-memory storage for beta settings until database schema is properly deployed
interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  limitedAccess: boolean;
  fullAccess: boolean;
}

interface BetaSettingsData {
  features: FeatureConfig[];
  updatedBy?: number;
  updatedAt?: Date;
}

// Default feature configuration
const DEFAULT_FEATURES: FeatureConfig[] = [
  {
    id: 'script-editor',
    name: 'Script Editor',
    description: 'Advanced script editing with cue building and visual overlays',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'props-tracker',
    name: 'Props Tracker',
    description: 'Scene/character organization and status tracking for props',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'costume-tracker',
    name: 'Costume Tracker',
    description: 'Quick-change timing and repair tracking for costumes',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'advanced-templates',
    name: 'Advanced Templates',
    description: 'Custom field types and dynamic template configuration',
    category: 'Reports & Templates',
    limitedAccess: true,
    fullAccess: true,
  },
  {
    id: 'team-collaboration',
    name: 'Team Collaboration',
    description: 'Enhanced team member permissions and collaboration tools',
    category: 'Team Management',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'calendar-management',
    name: 'Calendar Management',
    description: 'Advanced scheduling and calendar features',
    category: 'Planning',
    limitedAccess: true,
    fullAccess: true,
  },
  {
    id: 'cast-management',
    name: 'Cast Management',
    description: 'Character breakdowns and cast tracking tools',
    category: 'Production Tools',
    limitedAccess: false,
    fullAccess: true,
  },
  {
    id: 'task-boards',
    name: 'Task Boards',
    description: 'Kanban-style task management and workflow tracking',
    category: 'Planning',
    limitedAccess: true,
    fullAccess: true,
  }
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