// Project Settings Storage System

import { LocalStorage } from '../utils/storage';

export interface ProjectSettings {
  projectId: string;
  autoConfirmPlan: boolean;
  repositoryRules?: string;
  setupCommands?: string;
  selectedBranch?: string;
  secrets?: Record<string, string>;
  planningStatement?: string;
  lastUpdated: string;
}

const PROJECT_SETTINGS_KEY = 'project_settings';

// Get all project settings
export async function getAllProjectSettings(): Promise<Record<string, ProjectSettings>> {
  try {
    const settings = await LocalStorage.getItem(PROJECT_SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings) as Record<string, ProjectSettings>;
    }
    return {};
  } catch (error) {
    console.error('Failed to get all project settings:', error);
    return {};
  }
}

// Get settings for a specific project
export async function getProjectSettings(projectId: string): Promise<ProjectSettings> {
  try {
    const allSettings = await getAllProjectSettings();
    const settings = allSettings[projectId];
    
    if (settings) {
      return settings;
    }
    
    // Return default settings if none exist
    const defaultSettings: ProjectSettings = {
      projectId,
      autoConfirmPlan: false,
      lastUpdated: new Date().toISOString(),
    };
    
    return defaultSettings;
  } catch (error) {
    console.error('Failed to get project settings:', error);
    // Return default settings on error
    return {
      projectId,
      autoConfirmPlan: false,
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Update settings for a specific project
export async function updateProjectSettings(
  projectId: string, 
  updates: Partial<Omit<ProjectSettings, 'projectId' | 'lastUpdated'>>
): Promise<void> {
  try {
    const allSettings = await getAllProjectSettings();
    const currentSettings = allSettings[projectId] || {
      projectId,
      autoConfirmPlan: false,
      lastUpdated: new Date().toISOString(),
    };
    
    const updatedSettings: ProjectSettings = {
      ...currentSettings,
      ...updates,
      projectId, // Ensure projectId is always correct
      lastUpdated: new Date().toISOString(),
    };
    
    allSettings[projectId] = updatedSettings;
    await LocalStorage.setItem(PROJECT_SETTINGS_KEY, JSON.stringify(allSettings));
  } catch (error) {
    console.error('Failed to update project settings:', error);
    throw error;
  }
}

// Delete settings for a specific project
export async function deleteProjectSettings(projectId: string): Promise<void> {
  try {
    const allSettings = await getAllProjectSettings();
    delete allSettings[projectId];
    await LocalStorage.setItem(PROJECT_SETTINGS_KEY, JSON.stringify(allSettings));
  } catch (error) {
    console.error('Failed to delete project settings:', error);
    throw error;
  }
}

// Update repository rules
export async function updateRepositoryRules(projectId: string, rules: string): Promise<void> {
  await updateProjectSettings(projectId, { repositoryRules: rules });
}

// Update setup commands
export async function updateSetupCommands(projectId: string, commands: string): Promise<void> {
  await updateProjectSettings(projectId, { setupCommands: commands });
}

// Update selected branch
export async function updateSelectedBranch(projectId: string, branch: string): Promise<void> {
  await updateProjectSettings(projectId, { selectedBranch: branch });
}

// Update secrets
export async function updateSecrets(projectId: string, secrets: Record<string, string>): Promise<void> {
  await updateProjectSettings(projectId, { secrets });
}

// Add or update a single secret
export async function updateSecret(projectId: string, key: string, value: string): Promise<void> {
  const settings = await getProjectSettings(projectId);
  const updatedSecrets = {
    ...(settings.secrets || {}),
    [key]: value,
  };
  await updateProjectSettings(projectId, { secrets: updatedSecrets });
}

// Remove a secret
export async function removeSecret(projectId: string, key: string): Promise<void> {
  const settings = await getProjectSettings(projectId);
  if (settings.secrets) {
    const updatedSecrets = { ...settings.secrets };
    delete updatedSecrets[key];
    await updateProjectSettings(projectId, { secrets: updatedSecrets });
  }
}

// Update planning statement
export async function updatePlanningStatement(projectId: string, statement: string): Promise<void> {
  await updateProjectSettings(projectId, { planningStatement: statement });
}

// Toggle auto-confirm plan
export async function toggleAutoConfirmPlan(projectId: string): Promise<boolean> {
  const settings = await getProjectSettings(projectId);
  const newValue = !settings.autoConfirmPlan;
  await updateProjectSettings(projectId, { autoConfirmPlan: newValue });
  return newValue;
}

// Get secrets as environment variable string
export function secretsToEnvString(secrets: Record<string, string>): string {
  return Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

// Parse environment variable string to secrets object
export function envStringToSecrets(envString: string): Record<string, string> {
  const secrets: Record<string, string> = {};
  
  if (!envString.trim()) {
    return secrets;
  }
  
  const lines = envString.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('='); // Handle values that contain '='
      if (key.trim()) {
        secrets[key.trim()] = value;
      }
    }
  }
  
  return secrets;
}

// Validate environment variable name
export function isValidEnvVarName(name: string): boolean {
  // Environment variable names should start with a letter or underscore
  // and contain only letters, numbers, and underscores
  const envVarRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return envVarRegex.test(name);
}

// Clear all project settings
export async function clearAllProjectSettings(): Promise<void> {
  try {
    await LocalStorage.removeItem(PROJECT_SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to clear all project settings:', error);
    throw error;
  }
}

// Export project settings for backup
export async function exportProjectSettings(): Promise<string> {
  try {
    const allSettings = await getAllProjectSettings();
    return JSON.stringify(allSettings, null, 2);
  } catch (error) {
    console.error('Failed to export project settings:', error);
    throw error;
  }
}

// Import project settings from backup
export async function importProjectSettings(settingsJson: string): Promise<void> {
  try {
    const settings = JSON.parse(settingsJson) as Record<string, ProjectSettings>;
    await LocalStorage.setItem(PROJECT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to import project settings:', error);
    throw error;
  }
}
