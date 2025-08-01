// Web-compatible preferences utility that reads from .env file

import { LocalStorage } from './storage';

export interface Preferences {
  apiToken: string;
  defaultOrganization?: string;
  userId?: string;
  apiBaseUrl?: string;
  githubToken?: string;
  planningStatement?: string;
}

const PREFERENCES_KEY = 'app_preferences';

// Default preferences
const DEFAULT_PREFERENCES: Partial<Preferences> = {
  apiBaseUrl: '',
};

/**
 * Convert preferences to .env file content
 */
function preferencesToEnvContent(preferences: Partial<Preferences>): string {
  const lines: string[] = [];
  
  if (preferences.defaultOrganization) {
    lines.push(`org_id=${preferences.defaultOrganization}`);
  }
  
  if (preferences.apiToken) {
    lines.push(`token=${preferences.apiToken}`);
  }
  
  if (preferences.githubToken) {
    lines.push(`github_token=${preferences.githubToken}`);
  }
  
  if (preferences.apiBaseUrl && preferences.apiBaseUrl !== DEFAULT_PREFERENCES.apiBaseUrl) {
    lines.push(`api_base_url=${preferences.apiBaseUrl}`);
  }
  
  return lines.join('\n') + '\n';
}

/**
 * Get preference values from localStorage (since .env file can't be read directly in browser)
 */
export async function getPreferenceValues(): Promise<Preferences> {
  console.log('🔍 Loading preferences...');
   
   // Note: In a web environment, we can't directly read .env files
   // The .env file is processed at build time by Create React App
   // For runtime configuration, we use localStorage as the primary storage
   
   try {
     const stored = await LocalStorage.getItem(PREFERENCES_KEY);
     if (stored) {
       const parsed = JSON.parse(stored);
       const preferences = { ...DEFAULT_PREFERENCES, ...parsed };
       
       console.log('✅ Loaded preferences from localStorage:', {
         hasToken: !!preferences.apiToken,
         hasOrgId: !!preferences.defaultOrganization,
         apiBaseUrl: preferences.apiBaseUrl
       });
       
       return preferences;
     } else {
       console.log('ℹ️ No stored preferences found, using defaults');
     }
   } catch (error) {
     console.error('❌ Failed to get preference values from localStorage:', error);
   }
   
   // Check environment variables as fallback
   const envToken = process.env.REACT_APP_API_TOKEN;
   const envOrg = process.env.REACT_APP_DEFAULT_ORGANIZATION;
   const envApiBaseUrl = process.env.REACT_APP_API_BASE_URL;
   const envUserId = process.env.REACT_APP_USER_ID;
   
   console.log('🌍 Environment variables check:', {
     hasEnvToken: !!envToken,
     hasEnvOrg: !!envOrg,
     hasEnvApiBaseUrl: !!envApiBaseUrl,
     hasEnvUserId: !!envUserId,
     tokenValue: envToken ? `${envToken.substring(0, 8)}...` : 'not set',
     orgValue: envOrg || 'not set',
     apiBaseUrlValue: envApiBaseUrl || 'not set'
   });
   
   if (envToken || envOrg || envApiBaseUrl) {
     console.log('🌍 Loading from environment variables');
     
     const envPreferences: Preferences = {
       apiToken: envToken || '',
       defaultOrganization: envOrg || '',
       apiBaseUrl: envApiBaseUrl || DEFAULT_PREFERENCES.apiBaseUrl,
       userId: envUserId || '',
       ...DEFAULT_PREFERENCES
     };
     
     // Save environment variables to localStorage for future use
     if (envToken || envOrg) {
       await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(envPreferences));
       console.log('💾 Saved environment variables to localStorage');
     }
     
     return envPreferences;
   }
   
   // Return defaults if loading fails
   const defaults: Preferences = {
     apiToken: '',
     defaultOrganization: '',
     ...DEFAULT_PREFERENCES
   };
   console.log('🔧 Using default preferences:', defaults);
   return defaults;
}

/**
 * Set preference values - saves to localStorage and generates .env content for manual update
 */
export async function setPreferenceValues(preferences: Partial<Preferences>): Promise<void> {
  try {
    console.log('💾 Saving preferences...', {
      hasToken: !!preferences.apiToken,
      hasOrgId: !!preferences.defaultOrganization
    });
    
    // Save to localStorage as primary storage
    const current = await getPreferenceValues();
    const updated = { ...current, ...preferences };
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    
    // Generate .env content for manual file update
    const envContent = preferencesToEnvContent(updated);
    console.log('📝 Generated .env file content:');
    console.log('---');
    console.log(envContent);
    console.log('---');
    console.log('Please manually update your .env file at: c:\\Users\\L\\Desktop\\raycast-extension-main\\.env');
    
    // Store the .env content in localStorage for the Settings component to display
    await LocalStorage.setItem('env_file_content', envContent);
    
    console.log('✅ Preferences saved successfully!');
    
  } catch (error) {
    console.error('❌ Failed to set preference values:', error);
    throw error;
  }
}

/**
 * Get the generated .env file content for display
 */
export async function getEnvFileContent(): Promise<string> {
  try {
    const content = await LocalStorage.getItem('env_file_content');
    return content || '';
  } catch (error) {
    console.error('Failed to get env file content:', error);
    return '';
  }
}

/**
 * Clear all preferences
 */
export async function clearPreferences(): Promise<void> {
  try {
    await LocalStorage.removeItem(PREFERENCES_KEY);
  } catch (error) {
    console.error('Failed to clear preferences:', error);
    throw error;
  }
}

/**
 * Validate that required environment variables are present
 */
export function validateEnvironmentConfiguration(): { isValid: boolean; missingVars: string[]; warnings: string[] } {
  const missingVars: string[] = [];
  const warnings: string[] = [];
  
  // Check for required environment variables
  if (!process.env.REACT_APP_API_TOKEN) {
    missingVars.push('REACT_APP_API_TOKEN');
  }
  
  // Check for recommended environment variables
  if (!process.env.REACT_APP_API_BASE_URL) {
    warnings.push('REACT_APP_API_BASE_URL not set, using default: https://api.codegen.com');
  }
  
  if (!process.env.REACT_APP_DEFAULT_ORGANIZATION) {
    warnings.push('REACT_APP_DEFAULT_ORGANIZATION not set, you will need to select an organization manually');
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings
  };
}
