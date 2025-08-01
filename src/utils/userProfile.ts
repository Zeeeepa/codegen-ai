/**
 * User profile management
 * Handles user information, authentication state, and profile data
 */

import { storage } from './storage';
import { credentials } from './credentials';

export interface UserProfile {
  id?: string;
  username?: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  
  // GitHub Integration
  githubUsername?: string;
  githubId?: string;
  githubAvatarUrl?: string;
  
  // Codegen Integration
  codegenOrgId?: string;
  codegenUserId?: string;
  
  // Profile Settings
  timezone?: string;
  language?: string;
  
  // Metadata
  createdAt?: number;
  lastLoginAt?: number;
  lastActiveAt?: number;
  
  // Feature Access
  features?: string[];
  permissions?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  lastChecked?: number;
}

export interface UserSession {
  profile: UserProfile;
  authState: AuthState;
  sessionId?: string;
  expiresAt?: number;
}

class UserProfileManager {
  private readonly PROFILE_STORAGE_KEY = 'user_profile';
  private readonly SESSION_STORAGE_KEY = 'user_session';
  private profile: UserProfile = {};
  private authState: AuthState = { isAuthenticated: false, isLoading: false };
  private listeners: ((profile: UserProfile, authState: AuthState) => void)[] = [];

  constructor() {
    this.loadProfile();
    this.loadAuthState();
    this.startSessionCheck();
  }

  /**
   * Load user profile from storage
   */
  private loadProfile(): void {
    const stored = storage.get<UserProfile>(this.PROFILE_STORAGE_KEY);
    if (stored) {
      this.profile = stored;
      this.updateLastActive();
    }
  }

  /**
   * Load authentication state from storage
   */
  private loadAuthState(): void {
    const stored = storage.get<AuthState>('auth_state');
    if (stored) {
      this.authState = stored;
    }
  }

  /**
   * Save profile to storage
   */
  private saveProfile(): boolean {
    const success = storage.set(this.PROFILE_STORAGE_KEY, this.profile);
    if (success) {
      this.notifyListeners();
    }
    return success;
  }

  /**
   * Save authentication state to storage
   */
  private saveAuthState(): boolean {
    const success = storage.set('auth_state', this.authState);
    if (success) {
      this.notifyListeners();
    }
    return success;
  }

  /**
   * Get current user profile
   */
  getProfile(): UserProfile {
    return { ...this.profile };
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<UserProfile>): boolean {
    this.profile = { ...this.profile, ...updates };
    this.updateLastActive();
    return this.saveProfile();
  }

  /**
   * Set authentication state
   */
  setAuthState(authState: Partial<AuthState>): boolean {
    this.authState = { ...this.authState, ...authState, lastChecked: Date.now() };
    return this.saveAuthState();
  }

  /**
   * Initialize user profile from GitHub data
   */
  initializeFromGitHub(githubUser: any): boolean {
    const updates: Partial<UserProfile> = {
      githubUsername: githubUser.login,
      githubId: githubUser.id?.toString(),
      githubAvatarUrl: githubUser.avatar_url,
      displayName: githubUser.name || githubUser.login,
      email: githubUser.email,
      createdAt: this.profile.createdAt || Date.now(),
      lastLoginAt: Date.now()
    };

    return this.updateProfile(updates);
  }

  /**
   * Initialize user profile from Codegen data
   */
  initializeFromCodegen(codegenUser: any): boolean {
    const updates: Partial<UserProfile> = {
      codegenUserId: codegenUser.id,
      codegenOrgId: codegenUser.orgId,
      username: codegenUser.username,
      email: codegenUser.email || this.profile.email,
      displayName: codegenUser.displayName || this.profile.displayName,
      features: codegenUser.features || [],
      permissions: codegenUser.permissions || [],
      lastLoginAt: Date.now()
    };

    return this.updateProfile(updates);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && this.hasRequiredCredentials();
  }

  /**
   * Check if user has required credentials
   */
  private hasRequiredCredentials(): boolean {
    const creds = credentials.getCredentials();
    return !!(creds.CODEGEN_API_TOKEN && creds.GITHUB_TOKEN);
  }

  /**
   * Authenticate user
   */
  async authenticate(): Promise<boolean> {
    this.setAuthState({ isLoading: true, error: undefined });

    try {
      // Check if we have required credentials
      if (!this.hasRequiredCredentials()) {
        throw new Error('Missing required credentials');
      }

      // Verify GitHub token
      const githubValid = await this.verifyGitHubToken();
      if (!githubValid) {
        throw new Error('Invalid GitHub token');
      }

      // Verify Codegen token
      const codegenValid = await this.verifyCodegenToken();
      if (!codegenValid) {
        throw new Error('Invalid Codegen token');
      }

      this.setAuthState({ isAuthenticated: true, isLoading: false });
      this.updateLastActive();
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.setAuthState({ 
        isAuthenticated: false, 
        isLoading: false, 
        error: errorMessage 
      });
      return false;
    }
  }

  /**
   * Verify GitHub token
   */
  private async verifyGitHubToken(): Promise<boolean> {
    try {
      const token = credentials.getCredential('GITHUB_TOKEN');
      if (!token) return false;

      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const githubUser = await response.json();
        this.initializeFromGitHub(githubUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('GitHub token verification failed:', error);
      return false;
    }
  }

  /**
   * Verify Codegen token
   */
  private async verifyCodegenToken(): Promise<boolean> {
    try {
      const token = credentials.getCredential('CODEGEN_API_TOKEN');
      const orgId = credentials.getCredential('CODEGEN_ORG_ID');
      
      if (!token || !orgId) return false;

      // This would be replaced with actual Codegen API endpoint
      const response = await fetch(`https://api.codegen.com/v1/organizations/${orgId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const codegenUser = await response.json();
        this.initializeFromCodegen(codegenUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Codegen token verification failed:', error);
      return false;
    }
  }

  /**
   * Sign out user
   */
  signOut(): boolean {
    this.profile = {};
    this.authState = { isAuthenticated: false, isLoading: false };
    
    // Clear stored data
    storage.remove(this.PROFILE_STORAGE_KEY);
    storage.remove('auth_state');
    storage.remove(this.SESSION_STORAGE_KEY);
    
    this.notifyListeners();
    return true;
  }

  /**
   * Update last active timestamp
   */
  updateLastActive(): void {
    this.profile.lastActiveAt = Date.now();
    // Don't trigger full save/notify cycle for just activity updates
    storage.set(this.PROFILE_STORAGE_KEY, this.profile);
  }

  /**
   * Get user display name
   */
  getDisplayName(): string {
    return this.profile.displayName || 
           this.profile.githubUsername || 
           this.profile.username || 
           this.profile.email || 
           'User';
  }

  /**
   * Get user avatar URL
   */
  getAvatarUrl(): string | undefined {
    return this.profile.githubAvatarUrl || this.profile.avatar;
  }

  /**
   * Check if user has a specific feature
   */
  hasFeature(feature: string): boolean {
    return this.profile.features?.includes(feature) || false;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.profile.permissions?.includes(permission) || false;
  }

  /**
   * Subscribe to profile/auth changes
   */
  subscribe(listener: (profile: UserProfile, authState: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.profile }, { ...this.authState }));
  }

  /**
   * Start periodic session check
   */
  private startSessionCheck(): void {
    // Check session validity every 5 minutes
    setInterval(() => {
      if (this.authState.isAuthenticated) {
        this.updateLastActive();
        
        // Re-verify credentials periodically (every hour)
        const lastChecked = this.authState.lastChecked || 0;
        const oneHour = 60 * 60 * 1000;
        
        if (Date.now() - lastChecked > oneHour) {
          this.authenticate();
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Get session information
   */
  getSession(): UserSession {
    return {
      profile: this.getProfile(),
      authState: this.getAuthState(),
      sessionId: storage.get<string>('session_id'),
      expiresAt: storage.get<number>('session_expires')
    };
  }

  /**
   * Clear all user data
   */
  clearAllData(): boolean {
    this.signOut();
    credentials.clearCredentials();
    storage.clear();
    return true;
  }
}

export const userProfile = new UserProfileManager();

// Convenience functions
export const getProfile = () => userProfile.getProfile();
export const getAuthState = () => userProfile.getAuthState();
export const isAuthenticated = () => userProfile.isAuthenticated();
export const authenticate = () => userProfile.authenticate();
export const signOut = () => userProfile.signOut();
export const getDisplayName = () => userProfile.getDisplayName();
export const getAvatarUrl = () => userProfile.getAvatarUrl();

