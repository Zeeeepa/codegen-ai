/**
 * User preferences management
 * Handles application settings, UI preferences, and user customizations
 */

import { storage } from './storage';

export interface UserPreferences {
  // UI Preferences
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showNotifications: boolean;
  showBrowserNotifications: boolean;
  
  // Dashboard Preferences
  defaultView: 'projects' | 'agent-runs' | 'organizations';
  projectsPerPage: number;
  agentRunsPerPage: number;
  autoRefreshInterval: number; // in seconds, 0 = disabled
  
  // Agent Run Preferences
  autoConfirmPlans: boolean;
  autoMergePRs: boolean;
  showDetailedLogs: boolean;
  enableRealTimeUpdates: boolean;
  
  // Notification Preferences
  notifyOnAgentStart: boolean;
  notifyOnAgentComplete: boolean;
  notifyOnAgentError: boolean;
  notifyOnPRCreated: boolean;
  notifyOnPRMerged: boolean;
  
  // Advanced Preferences
  enableDebugMode: boolean;
  enableExperimentalFeatures: boolean;
  maxCachedAgentRuns: number;
  cacheExpirationHours: number;
  
  // Privacy Preferences
  shareUsageData: boolean;
  enableErrorReporting: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  // UI Preferences
  theme: 'system',
  compactMode: false,
  showNotifications: true,
  showBrowserNotifications: true,
  
  // Dashboard Preferences
  defaultView: 'projects',
  projectsPerPage: 12,
  agentRunsPerPage: 20,
  autoRefreshInterval: 30,
  
  // Agent Run Preferences
  autoConfirmPlans: false,
  autoMergePRs: false,
  showDetailedLogs: true,
  enableRealTimeUpdates: true,
  
  // Notification Preferences
  notifyOnAgentStart: true,
  notifyOnAgentComplete: true,
  notifyOnAgentError: true,
  notifyOnPRCreated: true,
  notifyOnPRMerged: true,
  
  // Advanced Preferences
  enableDebugMode: false,
  enableExperimentalFeatures: false,
  maxCachedAgentRuns: 100,
  cacheExpirationHours: 24,
  
  // Privacy Preferences
  shareUsageData: true,
  enableErrorReporting: true,
};

export interface PreferenceCategory {
  key: string;
  label: string;
  description: string;
  preferences: PreferenceField[];
}

export interface PreferenceField {
  key: keyof UserPreferences;
  label: string;
  description: string;
  type: 'boolean' | 'select' | 'number' | 'range';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const PREFERENCE_CATEGORIES: PreferenceCategory[] = [
  {
    key: 'ui',
    label: 'User Interface',
    description: 'Customize the appearance and behavior of the interface',
    preferences: [
      {
        key: 'theme',
        label: 'Theme',
        description: 'Choose your preferred color theme',
        type: 'select',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System' }
        ]
      },
      {
        key: 'compactMode',
        label: 'Compact Mode',
        description: 'Use a more compact layout to fit more content',
        type: 'boolean'
      },
      {
        key: 'showNotifications',
        label: 'Show In-App Notifications',
        description: 'Display notification badges and alerts in the interface',
        type: 'boolean'
      },
      {
        key: 'showBrowserNotifications',
        label: 'Browser Notifications',
        description: 'Show system notifications outside the browser',
        type: 'boolean'
      }
    ]
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Configure dashboard behavior and default views',
    preferences: [
      {
        key: 'defaultView',
        label: 'Default View',
        description: 'The view to show when opening the application',
        type: 'select',
        options: [
          { value: 'projects', label: 'Projects' },
          { value: 'agent-runs', label: 'Agent Runs' },
          { value: 'organizations', label: 'Organizations' }
        ]
      },
      {
        key: 'projectsPerPage',
        label: 'Projects Per Page',
        description: 'Number of projects to display per page',
        type: 'range',
        min: 6,
        max: 24,
        step: 6
      },
      {
        key: 'agentRunsPerPage',
        label: 'Agent Runs Per Page',
        description: 'Number of agent runs to display per page',
        type: 'range',
        min: 10,
        max: 50,
        step: 10
      },
      {
        key: 'autoRefreshInterval',
        label: 'Auto Refresh Interval',
        description: 'How often to refresh data automatically (0 = disabled)',
        type: 'range',
        min: 0,
        max: 300,
        step: 15,
        unit: 'seconds'
      }
    ]
  },
  {
    key: 'agent-runs',
    label: 'Agent Runs',
    description: 'Configure agent run behavior and automation',
    preferences: [
      {
        key: 'autoConfirmPlans',
        label: 'Auto-Confirm Plans',
        description: 'Automatically confirm proposed plans without manual review',
        type: 'boolean'
      },
      {
        key: 'autoMergePRs',
        label: 'Auto-Merge PRs',
        description: 'Automatically merge validated pull requests',
        type: 'boolean'
      },
      {
        key: 'showDetailedLogs',
        label: 'Show Detailed Logs',
        description: 'Display verbose logging information for agent runs',
        type: 'boolean'
      },
      {
        key: 'enableRealTimeUpdates',
        label: 'Real-Time Updates',
        description: 'Enable live updates for agent run status and logs',
        type: 'boolean'
      }
    ]
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Control when and how you receive notifications',
    preferences: [
      {
        key: 'notifyOnAgentStart',
        label: 'Agent Start Notifications',
        description: 'Notify when an agent run begins',
        type: 'boolean'
      },
      {
        key: 'notifyOnAgentComplete',
        label: 'Agent Complete Notifications',
        description: 'Notify when an agent run completes successfully',
        type: 'boolean'
      },
      {
        key: 'notifyOnAgentError',
        label: 'Agent Error Notifications',
        description: 'Notify when an agent run encounters an error',
        type: 'boolean'
      },
      {
        key: 'notifyOnPRCreated',
        label: 'PR Created Notifications',
        description: 'Notify when a pull request is created',
        type: 'boolean'
      },
      {
        key: 'notifyOnPRMerged',
        label: 'PR Merged Notifications',
        description: 'Notify when a pull request is merged',
        type: 'boolean'
      }
    ]
  },
  {
    key: 'advanced',
    label: 'Advanced',
    description: 'Advanced settings for power users',
    preferences: [
      {
        key: 'enableDebugMode',
        label: 'Debug Mode',
        description: 'Enable debug logging and additional developer tools',
        type: 'boolean'
      },
      {
        key: 'enableExperimentalFeatures',
        label: 'Experimental Features',
        description: 'Enable experimental features that may be unstable',
        type: 'boolean'
      },
      {
        key: 'maxCachedAgentRuns',
        label: 'Max Cached Agent Runs',
        description: 'Maximum number of agent runs to keep in cache',
        type: 'range',
        min: 50,
        max: 500,
        step: 50
      },
      {
        key: 'cacheExpirationHours',
        label: 'Cache Expiration',
        description: 'Hours after which cached data expires',
        type: 'range',
        min: 1,
        max: 168,
        step: 1,
        unit: 'hours'
      }
    ]
  },
  {
    key: 'privacy',
    label: 'Privacy',
    description: 'Control data sharing and privacy settings',
    preferences: [
      {
        key: 'shareUsageData',
        label: 'Share Usage Data',
        description: 'Help improve the application by sharing anonymous usage data',
        type: 'boolean'
      },
      {
        key: 'enableErrorReporting',
        label: 'Error Reporting',
        description: 'Automatically report errors to help improve stability',
        type: 'boolean'
      }
    ]
  }
];

class PreferencesManager {
  private readonly STORAGE_KEY = 'user_preferences';
  private preferences: UserPreferences;
  private listeners: ((preferences: UserPreferences) => void)[] = [];

  constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * Load preferences from storage
   */
  private loadPreferences(): UserPreferences {
    const stored = storage.get<UserPreferences>(this.STORAGE_KEY);
    return { ...DEFAULT_PREFERENCES, ...stored };
  }

  /**
   * Save preferences to storage
   */
  private savePreferences(): boolean {
    const success = storage.set(this.STORAGE_KEY, this.preferences);
    if (success) {
      this.notifyListeners();
    }
    return success;
  }

  /**
   * Get all preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Get a specific preference
   */
  getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.preferences[key];
  }

  /**
   * Update preferences (partial update)
   */
  updatePreferences(updates: Partial<UserPreferences>): boolean {
    this.preferences = { ...this.preferences, ...updates };
    return this.savePreferences();
  }

  /**
   * Set a specific preference
   */
  setPreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): boolean {
    this.preferences[key] = value;
    return this.savePreferences();
  }

  /**
   * Reset preferences to defaults
   */
  resetPreferences(): boolean {
    this.preferences = { ...DEFAULT_PREFERENCES };
    return this.savePreferences();
  }

  /**
   * Reset a specific category to defaults
   */
  resetCategory(categoryKey: string): boolean {
    const category = PREFERENCE_CATEGORIES.find(cat => cat.key === categoryKey);
    if (!category) return false;

    category.preferences.forEach(pref => {
      this.preferences[pref.key] = DEFAULT_PREFERENCES[pref.key];
    });

    return this.savePreferences();
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(listener: (preferences: UserPreferences) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of preference changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.preferences }));
  }

  /**
   * Export preferences for backup
   */
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from backup
   */
  importPreferences(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString) as Partial<UserPreferences>;
      this.preferences = { ...DEFAULT_PREFERENCES, ...imported };
      return this.savePreferences();
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }

  /**
   * Validate preference value
   */
  validatePreference<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ): { valid: boolean; error?: string } {
    const field = PREFERENCE_CATEGORIES
      .flatMap(cat => cat.preferences)
      .find(pref => pref.key === key);

    if (!field) {
      return { valid: false, error: 'Unknown preference key' };
    }

    switch (field.type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: 'Value must be a boolean' };
        }
        break;
      
      case 'number':
      case 'range':
        if (typeof value !== 'number') {
          return { valid: false, error: 'Value must be a number' };
        }
        if (field.min !== undefined && value < field.min) {
          return { valid: false, error: `Value must be at least ${field.min}` };
        }
        if (field.max !== undefined && value > field.max) {
          return { valid: false, error: `Value must be at most ${field.max}` };
        }
        break;
      
      case 'select':
        if (field.options && !field.options.some(opt => opt.value === value)) {
          return { valid: false, error: 'Value must be one of the available options' };
        }
        break;
    }

    return { valid: true };
  }
}

export const preferences = new PreferencesManager();

// Convenience functions
export const getPreferences = () => preferences.getPreferences();
export const getPreference = <K extends keyof UserPreferences>(key: K) => preferences.getPreference(key);
export const updatePreferences = (updates: Partial<UserPreferences>) => preferences.updatePreferences(updates);
export const setPreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => 
  preferences.setPreference(key, value);

