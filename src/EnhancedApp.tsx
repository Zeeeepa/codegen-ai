/**
 * Enhanced App Component
 * Integrates all new agent run functionality with existing project management
 */

import React, { useState, useEffect } from 'react';
import { Navigation, type NavigationView } from './components/Navigation';
import { Header } from './components/Header';
import { ProjectCard } from './components/ProjectCard';
import { GlobalSettingsModal } from './components/modals/GlobalSettingsModal';
import { CreateRunDialog } from './components/CreateRunDialog';
import { AgentRunDialog } from './components/AgentRunDialog';
import { AgentRunResponseModal } from './components/AgentRunResponseModal';
import { ListOrganizations } from './list-organizations';
import { CreateAgentRun } from './create-agent-run';
import { ListAgentRuns } from './list-agent-runs';
import { LoadingSpinner, Button, Card } from './components/ui';

// Import utilities
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCachedAgentRuns, type AgentRun } from './hooks/useCachedAgentRuns';
import { credentials, getCredentials, hasRequiredCredentials } from './utils/credentials';
import { userProfile, getProfile, getDisplayName, getAvatarUrl, isAuthenticated } from './utils/userProfile';
import { preferences, getPreference } from './utils/preferences';
import { notifications } from './utils/notifications';
import { toast } from './utils/toast';

// Import existing types and services
import type { Project, GlobalSettings, Organization } from './types';
import { setupProjectWebhook, getRepoPullRequests } from './services/github_service';
import { runValidationPipeline } from './services/grainchain_library';

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
    CODEGEN_ORG_ID: '',
    CODEGEN_API_TOKEN: '',
    GITHUB_TOKEN: '',
    GEMINI_API_KEY: '',
    CLOUDFLARE_API_KEY: '',
    CLOUDFLARE_ACCOUNT_ID: '',
    CLOUDFLARE_WORKER_NAME: 'webhook-gateway',
    CLOUDFLARE_WORKER_URL: '',
};

interface AppState {
  currentView: NavigationView;
  selectedOrganization?: Organization;
  selectedAgentRun?: AgentRun;
  showCreateRunDialog: boolean;
  showAgentRunDialog: boolean;
  showResponseModal: boolean;
  agentResponse?: any;
  isInitializing: boolean;
  authError?: string;
}

const EnhancedApp: React.FC = () => {
  // Existing state
  const [projects, setProjects] = useLocalStorage<Project[]>('dashboard-projects', []);
  const [globalSettings, setGlobalSettings] = useLocalStorage<GlobalSettings>('global-settings', DEFAULT_GLOBAL_SETTINGS);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  // New enhanced state
  const [appState, setAppState] = useState<AppState>({
    currentView: getPreference('defaultView') as NavigationView || 'projects',
    showCreateRunDialog: false,
    showAgentRunDialog: false,
    showResponseModal: false,
    isInitializing: true
  });

  // Initialize credentials from global settings
  useEffect(() => {
    credentials.updateCredentials({
      CODEGEN_ORG_ID: globalSettings.CODEGEN_ORG_ID,
      CODEGEN_API_TOKEN: globalSettings.CODEGEN_API_TOKEN,
      GITHUB_TOKEN: globalSettings.GITHUB_TOKEN,
      GEMINI_API_KEY: globalSettings.GEMINI_API_KEY,
      CLOUDFLARE_API_KEY: globalSettings.CLOUDFLARE_API_KEY,
      CLOUDFLARE_ACCOUNT_ID: globalSettings.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_WORKER_NAME: globalSettings.CLOUDFLARE_WORKER_NAME,
      CLOUDFLARE_WORKER_URL: globalSettings.CLOUDFLARE_WORKER_URL
    });
  }, [globalSettings]);

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (hasRequiredCredentials()) {
          const success = await userProfile.authenticate();
          if (!success) {
            setAppState(prev => ({ 
              ...prev, 
              authError: 'Authentication failed. Please check your credentials.',
              isInitializing: false 
            }));
            return;
          }
        }
        
        setAppState(prev => ({ ...prev, isInitializing: false }));
      } catch (error) {
        console.error('Authentication error:', error);
        setAppState(prev => ({ 
          ...prev, 
          authError: 'Failed to initialize authentication',
          isInitializing: false 
        }));
      }
    };

    initializeAuth();
  }, []);

  // Agent runs hook for the current organization
  const {
    runs: agentRuns,
    loading: agentRunsLoading,
    error: agentRunsError,
    refresh: refreshAgentRuns,
    addAgentRun,
    updateAgentRun
  } = useCachedAgentRuns(
    { organizationId: appState.selectedOrganization?.id || getCredentials().CODEGEN_ORG_ID || '' },
    {
      autoRefresh: getPreference('enableRealTimeUpdates'),
      refreshInterval: getPreference('autoRefreshInterval')
    }
  );

  // Handle navigation changes
  const handleViewChange = (view: NavigationView) => {
    setAppState(prev => ({ ...prev, currentView: view }));
    preferences.setPreference('defaultView', view);
  };

  // Handle organization selection
  const handleOrganizationSelect = (organization: Organization) => {
    setAppState(prev => ({ ...prev, selectedOrganization: organization }));
    toast.success('Organization Selected', `Switched to ${organization.name}`);
  };

  // Handle agent run creation
  const handleCreateAgentRun = () => {
    setAppState(prev => ({ ...prev, showCreateRunDialog: true }));
  };

  const handleAgentRunCreated = (agentRun: AgentRun) => {
    addAgentRun(agentRun);
    setAppState(prev => ({ ...prev, showCreateRunDialog: false }));
    toast.success('Agent Run Created', 'Your agent run has been started');
  };

  // Handle agent run selection
  const handleAgentRunSelect = (agentRun: AgentRun) => {
    setAppState(prev => ({ 
      ...prev, 
      selectedAgentRun: agentRun,
      showAgentRunDialog: true 
    }));
  };

  const handleAgentRunUpdate = (updatedRun: AgentRun) => {
    updateAgentRun(updatedRun.id, updatedRun);
    setAppState(prev => ({ 
      ...prev, 
      selectedAgentRun: updatedRun 
    }));
  };

  // Handle agent responses
  const handleAgentResponse = (response: any) => {
    setAppState(prev => ({ 
      ...prev, 
      agentResponse: response,
      showResponseModal: true 
    }));
  };

  // Get user profile data
  const profile = getProfile();
  const displayName = getDisplayName();
  const avatarUrl = getAvatarUrl();
  const unreadNotifications = notifications.getUnreadCount();

  // Show loading screen during initialization
  if (appState.isInitializing) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-400">Initializing Codegen AI...</p>
        </div>
      </div>
    );
  }

  // Show authentication error
  if (appState.authError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-4 p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">{appState.authError}</p>
          <Button onClick={() => setIsGlobalSettingsOpen(true)}>
            Configure Settings
          </Button>
        </Card>
      </div>
    );
  }

  // Render main content based on current view
  const renderMainContent = () => {
    switch (appState.currentView) {
      case 'organizations':
        return (
          <ListOrganizations
            onOrganizationSelect={handleOrganizationSelect}
            selectedOrganizationId={appState.selectedOrganization?.id}
          />
        );

      case 'agent-runs':
        return (
          <ListAgentRuns
            organizationId={appState.selectedOrganization?.id || getCredentials().CODEGEN_ORG_ID || ''}
            onAgentRunSelect={handleAgentRunSelect}
            onCreateAgentRun={handleCreateAgentRun}
          />
        );

      case 'settings':
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
            <Card className="p-6">
              <p className="text-gray-400 mb-4">
                Configure your Codegen AI settings, credentials, and preferences.
              </p>
              <Button onClick={() => setIsGlobalSettingsOpen(true)}>
                Open Global Settings
              </Button>
            </Card>
          </div>
        );

      case 'projects':
      default:
        return (
          <div className="space-y-6">
            {/* Enhanced Header with Create Agent Run */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Projects</h2>
                <p className="text-gray-400 mt-1">
                  Manage your GitHub projects and create agent runs
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button onClick={handleCreateAgentRun} variant="outline">
                  Create Agent Run
                </Button>
                <Button onClick={() => handleViewChange('agent-runs')} variant="outline">
                  View All Runs
                </Button>
              </div>
            </div>

            {/* Projects Grid */}
            {projects.length === 0 ? (
              <Card className="p-8 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">No Projects Yet</h3>
                <p className="text-gray-400 mb-4">
                  Add your first GitHub project to get started with AI-powered development.
                </p>
                <Button onClick={() => setIsGlobalSettingsOpen(true)}>
                  Configure GitHub Integration
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onUpdate={(updatedProject) => {
                      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                    }}
                    onDelete={(projectId) => {
                      setProjects(prev => prev.filter(p => p.id !== projectId));
                    }}
                    onCreateAgentRun={() => handleCreateAgentRun()}
                  />
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <Navigation
        currentView={appState.currentView}
        onViewChange={handleViewChange}
        organizationName={appState.selectedOrganization?.name}
        unreadNotifications={unreadNotifications}
        userName={displayName}
        userAvatar={avatarUrl}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderMainContent()}
      </main>

      {/* Modals */}
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        settings={globalSettings}
        onSave={setGlobalSettings}
      />

      <CreateRunDialog
        isOpen={appState.showCreateRunDialog}
        onClose={() => setAppState(prev => ({ ...prev, showCreateRunDialog: false }))}
        organizationId={appState.selectedOrganization?.id || getCredentials().CODEGEN_ORG_ID || ''}
        onAgentRunCreated={handleAgentRunCreated}
      />

      {appState.selectedAgentRun && (
        <AgentRunDialog
          isOpen={appState.showAgentRunDialog}
          onClose={() => setAppState(prev => ({ ...prev, showAgentRunDialog: false, selectedAgentRun: undefined }))}
          agentRun={appState.selectedAgentRun}
          onAgentRunUpdate={handleAgentRunUpdate}
        />
      )}

      {appState.agentResponse && (
        <AgentRunResponseModal
          isOpen={appState.showResponseModal}
          onClose={() => setAppState(prev => ({ ...prev, showResponseModal: false, agentResponse: undefined }))}
          agentRun={appState.selectedAgentRun!}
          response={appState.agentResponse}
          onResponseSubmit={(response, action) => {
            console.log('User response:', response, action);
            // Handle user response to agent
          }}
          onPlanApprove={(planId) => {
            console.log('Plan approved:', planId);
            // Handle plan approval
          }}
          onPlanModify={(planId, modifications) => {
            console.log('Plan modifications:', planId, modifications);
            // Handle plan modifications
          }}
        />
      )}
    </div>
  );
};

export default EnhancedApp;
