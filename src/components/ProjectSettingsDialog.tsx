import React, { useState, useEffect } from 'react';
import { X, Settings, FileText, Terminal, Key, GitBranch, Play, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { CachedProject } from '../api/types';
import { GitHubBranch } from '../api/githubTypes';
import { 
  getProjectSettings, 
  updateProjectSettings, 
  ProjectSettings,
  secretsToEnvString,
  envStringToSecrets,
  isValidEnvVarName
} from '../storage/projectSettings';
import { getGitHubClient } from '../api/github';
import { getPreferenceValues } from '../utils/preferences';
import toast from 'react-hot-toast';

interface ProjectSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: CachedProject;
  onUpdate: () => void;
}

type TabType = 'rules' | 'setup' | 'secrets';

export function ProjectSettingsDialog({ isOpen, onClose, project, onUpdate }: ProjectSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Rules tab state
  const [repositoryRules, setRepositoryRules] = useState('');
  
  // Setup tab state
  const [setupCommands, setSetupCommands] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [runningSetup, setRunningSetup] = useState(false);
  const [setupLogs, setSetupLogs] = useState('');
  const [setupStatus, setSetupStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  
  // Secrets tab state
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [secretsMode, setSecretsMode] = useState<'individual' | 'text'>('individual');
  const [secretsText, setSecretsText] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadBranches();
    }
  }, [isOpen, project.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const projectSettings = await getProjectSettings(project.id);
      setSettings(projectSettings);
      
      // Populate form fields
      setRepositoryRules(projectSettings.repositoryRules || '');
      setSetupCommands(projectSettings.setupCommands || '');
      setSelectedBranch(projectSettings.selectedBranch || project.defaultBranch);
      setSecrets(projectSettings.secrets || {});
      setSecretsText(secretsToEnvString(projectSettings.secrets || {}));
    } catch (error) {
      console.error('Failed to load project settings:', error);
      toast.error('Failed to load project settings');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const preferences = await getPreferenceValues();
      if (!preferences.githubToken) {
        return;
      }

      const client = getGitHubClient(preferences.githubToken);
      const [owner, repo] = project.id.split('/');
      if (!owner || !repo) return;

      const branchList = await client.getRepositoryBranches(owner, repo, 100);
      setBranches(branchList);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      const updates: Partial<ProjectSettings> = {
        repositoryRules: repositoryRules.trim() || undefined,
        setupCommands: setupCommands.trim() || undefined,
        selectedBranch: selectedBranch || undefined,
        secrets: Object.keys(secrets).length > 0 ? secrets : undefined,
      };

      await updateProjectSettings(project.id, updates);
      toast.success('Project settings saved successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to save project settings:', error);
      toast.error('Failed to save project settings');
    }
  };

  const handleRunSetup = async () => {
    if (!setupCommands.trim()) {
      toast.error('No setup commands to run');
      return;
    }

    setRunningSetup(true);
    setSetupStatus('running');
    setSetupLogs('Starting setup commands...\n');

    try {
      // This is a mock implementation - in a real app, you'd send this to a backend
      // that can execute commands in a sandboxed environment
      const commands = setupCommands.split('\n').filter(cmd => cmd.trim());
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i].trim();
        if (!command) continue;

        setSetupLogs(prev => prev + `\n$ ${command}\n`);
        
        // Simulate command execution
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock success/failure
        if (command.includes('npm install') || command.includes('pip install')) {
          setSetupLogs(prev => prev + `Installing dependencies...\nDone.\n`);
        } else if (command.includes('cd ')) {
          setSetupLogs(prev => prev + `Changed directory.\n`);
        } else {
          setSetupLogs(prev => prev + `Command executed successfully.\n`);
        }
      }

      setSetupStatus('success');
      setSetupLogs(prev => prev + '\n✅ Setup completed successfully!');
      toast.success('Setup commands completed successfully');
    } catch (error) {
      setSetupStatus('error');
      setSetupLogs(prev => prev + `\n❌ Setup failed: ${error}`);
      toast.error('Setup commands failed');
    } finally {
      setRunningSetup(false);
    }
  };

  const handleAddSecret = () => {
    if (!newSecretKey.trim() || !newSecretValue.trim()) {
      toast.error('Please enter both key and value');
      return;
    }

    if (!isValidEnvVarName(newSecretKey)) {
      toast.error('Invalid environment variable name. Use letters, numbers, and underscores only.');
      return;
    }

    setSecrets(prev => ({
      ...prev,
      [newSecretKey]: newSecretValue,
    }));

    setNewSecretKey('');
    setNewSecretValue('');
  };

  const handleRemoveSecret = (key: string) => {
    setSecrets(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSecretsTextChange = (text: string) => {
    setSecretsText(text);
    try {
      const parsedSecrets = envStringToSecrets(text);
      setSecrets(parsedSecrets);
    } catch (error) {
      // Invalid format, don't update secrets object
    }
  };

  const handleSecretsModeChange = (mode: 'individual' | 'text') => {
    if (mode === 'text') {
      setSecretsText(secretsToEnvString(secrets));
    } else {
      try {
        const parsedSecrets = envStringToSecrets(secretsText);
        setSecrets(parsedSecrets);
      } catch (error) {
        toast.error('Invalid environment variables format');
      }
    }
    setSecretsMode(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Project Settings</h2>
              <p className="text-sm text-gray-400">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'rules'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Repository Rules
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'setup'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Terminal className="h-4 w-4 inline mr-2" />
              Setup Commands
            </button>
            <button
              onClick={() => setActiveTab('secrets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'secrets'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Key className="h-4 w-4 inline mr-2" />
              Secrets
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Repository Rules Tab */}
              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Repository Rules</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Specify any additional rules you want the agent to follow for this repository.
                    </p>
                  </div>
                  
                  <div>
                    <textarea
                      value={repositoryRules}
                      onChange={(e) => setRepositoryRules(e.target.value)}
                      placeholder="Enter specific rules for this repository..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={12}
                    />
                  </div>
                </div>
              )}

              {/* Setup Commands Tab */}
              {activeTab === 'setup' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Setup Commands</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Specify the commands to run when setting up the sandbox environment.
                    </p>
                  </div>

                  {/* Branch Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Branch
                    </label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loadingBranches}
                    >
                      {loadingBranches ? (
                        <option>Loading branches...</option>
                      ) : (
                        branches.map((branch) => (
                          <option key={branch.name} value={branch.name}>
                            {branch.name} {branch.name === project.defaultBranch && '(default)'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Setup Commands */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Commands
                    </label>
                    <textarea
                      value={setupCommands}
                      onChange={(e) => setSetupCommands(e.target.value)}
                      placeholder={`cd backend\npython api.py\ncd ..\ncd frontend\nnpm install\nnpm run dev`}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                      rows={8}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRunSetup}
                      disabled={!setupCommands.trim() || runningSetup}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {runningSetup ? 'Running...' : 'Run'}
                    </button>
                    
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                  </div>

                  {/* Setup Logs */}
                  {setupLogs && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Logs
                      </label>
                      <div className={`p-3 rounded-md border font-mono text-sm ${
                        setupStatus === 'success' ? 'bg-green-900/20 border-green-700 text-green-300' :
                        setupStatus === 'error' ? 'bg-red-900/20 border-red-700 text-red-300' :
                        'bg-gray-800 border-gray-600 text-gray-300'
                      }`}>
                        <pre className="whitespace-pre-wrap">{setupLogs}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Secrets Tab */}
              {activeTab === 'secrets' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Environment Variables</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Manage environment variables that will be available during agent runs.
                    </p>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleSecretsModeChange('individual')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        secretsMode === 'individual'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Individual Variables
                    </button>
                    <button
                      onClick={() => handleSecretsModeChange('text')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        secretsMode === 'text'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Paste as Text
                    </button>
                  </div>

                  {secretsMode === 'individual' ? (
                    <>
                      {/* Add New Secret */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Add New Variable</h4>
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={newSecretKey}
                            onChange={(e) => setNewSecretKey(e.target.value)}
                            placeholder="ENV_VAR_NAME"
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                          />
                          <span className="text-gray-400">=</span>
                          <input
                            type="text"
                            value={newSecretValue}
                            onChange={(e) => setNewSecretValue(e.target.value)}
                            placeholder="VALUE"
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                          />
                          <button
                            onClick={handleAddSecret}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Existing Secrets */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Current Variables</h4>
                        {Object.keys(secrets).length === 0 ? (
                          <p className="text-sm text-gray-500">No environment variables configured.</p>
                        ) : (
                          <div className="space-y-2">
                            {Object.entries(secrets).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-3 p-3 bg-gray-800 border border-gray-600 rounded-md">
                                <span className="font-mono text-sm text-blue-400 flex-shrink-0">{key}</span>
                                <span className="text-gray-400">=</span>
                                <span className="font-mono text-sm text-gray-300 flex-1 truncate">
                                  {'*'.repeat(Math.min(value.length, 20))}
                                </span>
                                <button
                                  onClick={() => handleRemoveSecret(key)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">Environment Variables (Text Format)</h4>
                      <textarea
                        value={secretsText}
                        onChange={(e) => handleSecretsTextChange(e.target.value)}
                        placeholder="CODEGEN_ORG_ID=323&#10;CODEGEN_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                        rows={8}
                      />
                      <p className="text-xs text-gray-500">
                        Format: KEY=VALUE (one per line)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
