/**
 * Credentials management utility
 * Handles secure storage and retrieval of API keys and tokens
 */

import { storage } from './storage';

export interface Credentials {
  CODEGEN_ORG_ID?: string;
  CODEGEN_API_TOKEN?: string;
  GITHUB_TOKEN?: string;
  GEMINI_API_KEY?: string;
  CLOUDFLARE_API_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_WORKER_NAME?: string;
  CLOUDFLARE_WORKER_URL?: string;
}

export interface CredentialField {
  key: keyof Credentials;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  description?: string;
  placeholder?: string;
}

export const CREDENTIAL_FIELDS: CredentialField[] = [
  {
    key: 'CODEGEN_ORG_ID',
    label: 'Codegen Organization ID',
    type: 'text',
    required: true,
    description: 'Your Codegen organization identifier',
    placeholder: '323'
  },
  {
    key: 'CODEGEN_API_TOKEN',
    label: 'Codegen API Token',
    type: 'password',
    required: true,
    description: 'API token for Codegen services',
    placeholder: 'sk-...'
  },
  {
    key: 'GITHUB_TOKEN',
    label: 'GitHub Personal Access Token',
    type: 'password',
    required: true,
    description: 'GitHub PAT with repo and workflow permissions',
    placeholder: 'github_pat_...'
  },
  {
    key: 'GEMINI_API_KEY',
    label: 'Gemini API Key',
    type: 'password',
    required: false,
    description: 'Google Gemini API key for AI features',
    placeholder: 'AIzaSy...'
  },
  {
    key: 'CLOUDFLARE_API_KEY',
    label: 'Cloudflare API Key',
    type: 'password',
    required: false,
    description: 'Cloudflare API key for webhook management',
    placeholder: 'Your Cloudflare API key'
  },
  {
    key: 'CLOUDFLARE_ACCOUNT_ID',
    label: 'Cloudflare Account ID',
    type: 'text',
    required: false,
    description: 'Your Cloudflare account identifier',
    placeholder: 'Account ID'
  },
  {
    key: 'CLOUDFLARE_WORKER_NAME',
    label: 'Cloudflare Worker Name',
    type: 'text',
    required: false,
    description: 'Name of your webhook gateway worker',
    placeholder: 'webhook-gateway'
  },
  {
    key: 'CLOUDFLARE_WORKER_URL',
    label: 'Cloudflare Worker URL',
    type: 'url',
    required: false,
    description: 'URL of your deployed webhook worker',
    placeholder: 'https://webhook-gateway.your-subdomain.workers.dev'
  }
];

class CredentialsManager {
  private readonly STORAGE_KEY = 'credentials';

  /**
   * Get all stored credentials
   */
  getCredentials(): Credentials {
    return storage.get<Credentials>(this.STORAGE_KEY, {});
  }

  /**
   * Update credentials (partial update)
   */
  updateCredentials(updates: Partial<Credentials>): boolean {
    const current = this.getCredentials();
    const updated = { ...current, ...updates };
    return storage.set(this.STORAGE_KEY, updated);
  }

  /**
   * Set a specific credential
   */
  setCredential(key: keyof Credentials, value: string): boolean {
    return this.updateCredentials({ [key]: value });
  }

  /**
   * Get a specific credential
   */
  getCredential(key: keyof Credentials): string | undefined {
    const credentials = this.getCredentials();
    return credentials[key];
  }

  /**
   * Remove a specific credential
   */
  removeCredential(key: keyof Credentials): boolean {
    const credentials = this.getCredentials();
    delete credentials[key];
    return storage.set(this.STORAGE_KEY, credentials);
  }

  /**
   * Clear all credentials
   */
  clearCredentials(): boolean {
    return storage.remove(this.STORAGE_KEY);
  }

  /**
   * Check if required credentials are present
   */
  hasRequiredCredentials(): boolean {
    const credentials = this.getCredentials();
    const requiredFields = CREDENTIAL_FIELDS.filter(field => field.required);
    
    return requiredFields.every(field => {
      const value = credentials[field.key];
      return value && value.trim().length > 0;
    });
  }

  /**
   * Get missing required credentials
   */
  getMissingCredentials(): CredentialField[] {
    const credentials = this.getCredentials();
    const requiredFields = CREDENTIAL_FIELDS.filter(field => field.required);
    
    return requiredFields.filter(field => {
      const value = credentials[field.key];
      return !value || value.trim().length === 0;
    });
  }

  /**
   * Validate credential format
   */
  validateCredential(key: keyof Credentials, value: string): { valid: boolean; error?: string } {
    if (!value || value.trim().length === 0) {
      return { valid: false, error: 'Value is required' };
    }

    switch (key) {
      case 'GITHUB_TOKEN':
        if (!value.startsWith('github_pat_') && !value.startsWith('ghp_')) {
          return { valid: false, error: 'GitHub token should start with github_pat_ or ghp_' };
        }
        break;
      case 'GEMINI_API_KEY':
        if (!value.startsWith('AIzaSy')) {
          return { valid: false, error: 'Gemini API key should start with AIzaSy' };
        }
        break;
      case 'CODEGEN_API_TOKEN':
        if (!value.startsWith('sk-')) {
          return { valid: false, error: 'Codegen API token should start with sk-' };
        }
        break;
      case 'CLOUDFLARE_WORKER_URL':
        try {
          new URL(value);
        } catch {
          return { valid: false, error: 'Invalid URL format' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Mask sensitive credential for display
   */
  maskCredential(value: string): string {
    if (!value || value.length < 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  }

  /**
   * Export credentials (for backup/migration)
   */
  exportCredentials(): string {
    const credentials = this.getCredentials();
    return JSON.stringify(credentials, null, 2);
  }

  /**
   * Import credentials (from backup/migration)
   */
  importCredentials(jsonString: string): boolean {
    try {
      const credentials = JSON.parse(jsonString) as Credentials;
      return storage.set(this.STORAGE_KEY, credentials);
    } catch (error) {
      console.error('Failed to import credentials:', error);
      return false;
    }
  }
}

export const credentials = new CredentialsManager();

// Convenience functions
export const getCredentials = () => credentials.getCredentials();
export const updateCredentials = (updates: Partial<Credentials>) => credentials.updateCredentials(updates);
export const hasRequiredCredentials = () => credentials.hasRequiredCredentials();
export const getMissingCredentials = () => credentials.getMissingCredentials();

