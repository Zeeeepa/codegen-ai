import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Globe, 
  Webhook, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  ExternalLink,
  Cloud,
  Upload,
  Github,
  Eye,
  EyeOff
} from 'lucide-react';
import { GitHubAPI } from '../../utils/api';
import { Repository } from '../../types';

interface CloudflareStatus {
  workerUrl: string | null;
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
  lastChecked: Date | null;
}

interface EnhancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudflareStatus: CloudflareStatus;
  api: GitHubAPI | null;
  selectedRepositories: Repository[];
  onTokenSaved?: (token: string) => void;
}

export default function EnhancedSettingsModal({ 
  isOpen, 
  onClose, 
  cloudflareStatus, 
  api, 
  selectedRepositories,
  onTokenSaved 
}: EnhancedSettingsModalProps) {
  const [webhookStatus, setWebhookStatus] = useState<Record<string, { status: 'checking' | 'configured' | 'missing' | 'error', url?: string }>>({});
  const [isCheckingWebhooks, setIsCheckingWebhooks] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Load GitHub token and Cloudflare configuration on mount
  useEffect(() => {
    // Load GitHub token from environment or localStorage
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    if (envToken) {
      setGithubToken(envToken);
      validateGitHubToken(envToken);
    } else {
      const stored = localStorage.getItem('github_token');
      if (stored) {
        // For display purposes, we'll show a masked version
        setGithubToken('••••••••••••••••••••••••••••••••••••••••');
        setTokenStatus('valid'); // Assume valid if stored
      }
    }

    const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
    if (workerUrl) {
      validateCloudflareWorker(workerUrl);
    }
  }, []);

  // Check webhook status for selected repositories
  useEffect(() => {
    if (selectedRepositories.length > 0 && api && cloudflareStatus.workerUrl) {
      checkWebhookStatus();
    }
  }, [selectedRepositories, api, cloudflareStatus.workerUrl]);

  const validateGitHubToken = async (token: string) => {
    if (!token || token.startsWith('••••')) return false;
    
    setTokenStatus('validating');
    setTokenError(null);
    
    try {
      const testApi = new GitHubAPI(token);
      const isValid = await testApi.validateToken();
      
      if (isValid) {
        setTokenStatus('valid');
        setTokenError(null);
        return true;
      } else {
        setTokenStatus('invalid');
        setTokenError('Invalid token or insufficient permissions');
        return false;
      }
    } catch (error) {
      console.error('GitHub token validation failed:', error);
      setTokenStatus('invalid');
      setTokenError(error instanceof Error ? error.message : 'Failed to validate token');
      return false;
    }
  };

  const saveTokenToEnv = async (token: string) => {
    try {
      const response = await fetch('/api/save-github-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save token');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving token to .env:', error);
      return false;
    }
  };

  const handleTokenChange = async (newToken: string) => {
    setGithubToken(newToken);
    if (newToken.length >= 40) {
      const isValid = await validateGitHubToken(newToken);
      // If token is valid, save it to .env file and localStorage
      if (isValid) {
        const saved = await saveTokenToEnv(newToken);
        if (saved) {
          // Clear any existing localStorage token to avoid conflicts
          localStorage.removeItem('github_token');
          // Save to localStorage for immediate use
          if (onTokenSaved) {
            onTokenSaved(newToken);
          }
          // Show success message
          setTokenError(null);
          // Suggest page refresh for environment variable to take effect
          setTimeout(() => {
            if (confirm('Token saved successfully! Refresh the page to load the new token from environment?')) {
              window.location.reload();
            }
          }, 500);
        } else {
          setTokenError('Failed to save token to environment file');
        }
      }
    } else {
      setTokenStatus('idle');
      setTokenError(null);
    }
  };

  const validateCloudflareWorker = async (workerUrl: string) => {
    try {
      // Test the worker endpoint
      const response = await fetch(`${workerUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Cloudflare Worker validation successful:', data);
      } else {
        throw new Error(`Worker responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Cloudflare Worker validation failed:', error);
    }
  };

  const checkWebhookStatus = async () => {
    if (!api || !cloudflareStatus.workerUrl || selectedRepositories.length === 0) {
      return;
    }

    setIsCheckingWebhooks(true);
    const newWebhookStatus: Record<string, { status: 'checking' | 'configured' | 'missing' | 'error', url?: string }> = {};

    // Initialize status for all repos
    selectedRepositories.forEach(repo => {
      newWebhookStatus[repo.full_name] = { status: 'checking' };
    });
    setWebhookStatus(newWebhookStatus);

    for (const repo of selectedRepositories) {
      try {
        const webhooks = await api.getWebhooks(repo.full_name);
        const cloudflareWebhook = webhooks.find(webhook => 
          webhook.config.url?.includes(cloudflareStatus.workerUrl!)
        );

        if (cloudflareWebhook) {
          newWebhookStatus[repo.full_name] = { 
            status: 'configured', 
            url: cloudflareWebhook.config.url 
          };
        } else {
          newWebhookStatus[repo.full_name] = { status: 'missing' };
        }
      } catch (error) {
        console.error(`Failed to check webhooks for ${repo.full_name}:`, error);
        newWebhookStatus[repo.full_name] = { status: 'error' };
      }

      setWebhookStatus({ ...newWebhookStatus });
    }

    setIsCheckingWebhooks(false);
  };

  const retryValidation = () => {
    if (cloudflareStatus.workerUrl) {
      validateCloudflareWorker(cloudflareStatus.workerUrl);
    }
  };

  const refreshWebhookStatus = () => {
    checkWebhookStatus();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Dashboard Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor Cloudflare Worker status and webhook configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* GitHub Token Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Github className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  GitHub Authentication
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure your GitHub Personal Access Token
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
              <div className="space-y-3">
                <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    id="github-token"
                    value={githubToken}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {tokenStatus === 'validating' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {tokenStatus === 'valid' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {tokenStatus === 'invalid' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                {tokenError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{tokenError}</p>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p className="mb-1">Token requirements:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Minimum 40 characters</li>
                    <li>• Requires 'repo' and 'user' scopes</li>
                    <li>• Can be set via .env file (VITE_GITHUB_TOKEN)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Cloudflare Worker Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Cloud className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cloudflare Worker Status
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Monitor your webhook gateway worker health and connectivity
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Worker Health</h4>
                    {cloudflareStatus.isValid && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">HEALTHY</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {cloudflareStatus.isValidating 
                      ? 'Checking worker health...'
                      : cloudflareStatus.isValid 
                      ? 'Worker is responding and ready to receive webhooks'
                      : 'Worker validation required'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium transition-colors ${
                    cloudflareStatus.isValid 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {cloudflareStatus.isValidating ? '...' : (cloudflareStatus.isValid ? 'HEALTHY' : 'UNKNOWN')}
                  </span>
                  <button
                    onClick={retryValidation}
                    disabled={cloudflareStatus.isValidating}
                    className={`p-2 rounded-lg transition-colors ${
                      cloudflareStatus.isValidating
                        ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                        : 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                    }`}
                    title="Validate worker"
                  >
                    {cloudflareStatus.isValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600 dark:text-orange-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Worker URL Display */}
              {cloudflareStatus.workerUrl && (
                <div className="bg-white dark:bg-gray-700 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Cloud className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Worker Information</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Worker URL</p>
                        <p className="text-sm text-gray-900 dark:text-white font-mono break-all">{cloudflareStatus.workerUrl}</p>
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button
                          onClick={() => copyToClipboard(cloudflareStatus.workerUrl!)}
                          className="p-2 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Copy URL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <a
                          href={cloudflareStatus.workerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Open in browser"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {cloudflareStatus.lastChecked && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last checked: {cloudflareStatus.lastChecked.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Worker Status */}
              {cloudflareStatus.error && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-red-800 dark:text-red-200 text-sm">{cloudflareStatus.error}</span>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Check your Cloudflare Worker deployment and try validating again.
                      </p>
                    </div>
                  </div>
                  
                  {/* Deployment Instructions */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="space-y-3 flex-1">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Deploy Cloudflare Worker
                        </h4>
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          Your Cloudflare Worker needs to be deployed to receive webhook events. Follow these steps:
                        </p>
                        <div className="space-y-3">
                           {/* Automated Deployment Option */}
                           <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-md p-3">
                             <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-2">🚀 Automated Deployment (Recommended):</p>
                             <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono text-xs text-gray-800 dark:text-gray-200 mb-2">
                               npm run setup
                             </div>
                             <p className="text-xs text-green-800 dark:text-green-200">
                               This script handles everything automatically - you only need to authenticate when prompted.
                             </p>
                           </div>
                           
                           {/* Manual Steps */}
                           <div className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                             Or deploy manually:
                           </div>
                           <div className="space-y-2">
                             <div className="bg-white dark:bg-blue-900/30 rounded-md p-3 border border-blue-200 dark:border-blue-700">
                               <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">1. Install Wrangler CLI:</p>
                               <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono text-xs text-gray-800 dark:text-gray-200">
                                 npm install -g wrangler
                               </div>
                             </div>
                             <div className="bg-white dark:bg-blue-900/30 rounded-md p-3 border border-blue-200 dark:border-blue-700">
                               <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">2. Login to Cloudflare:</p>
                               <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono text-xs text-gray-800 dark:text-gray-200">
                                 wrangler login
                               </div>
                             </div>
                             <div className="bg-white dark:bg-blue-900/30 rounded-md p-3 border border-blue-200 dark:border-blue-700">
                               <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">3. Deploy the worker:</p>
                               <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono text-xs text-gray-800 dark:text-gray-200">
                                 wrangler deploy scripts/cloudflare/worker.js --name webhook-gateway
                               </div>
                             </div>
                           </div>
                         </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open('https://developers.cloudflare.com/workers/get-started/', '_blank')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md font-medium transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Cloudflare Docs
                          </button>
                          <button
                            onClick={() => window.open('https://dash.cloudflare.com/', '_blank')}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-md font-medium transition-colors flex items-center gap-1"
                          >
                            <Cloud className="w-3 h-3" />
                            Cloudflare Dashboard
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {cloudflareStatus.isValid && (
                <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-green-50 to-orange-50 dark:from-green-900/20 dark:to-orange-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                      Cloudflare Worker is healthy and ready for webhooks
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Webhook Status for Selected Projects */}
          {selectedRepositories.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Webhook className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Webhook Status for Selected Projects
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Monitor webhook configuration for {selectedRepositories.length} selected repositories
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected Repositories ({selectedRepositories.length})
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Checking for Cloudflare Worker webhook configuration
                    </p>
                  </div>
                  <button
                    onClick={refreshWebhookStatus}
                    disabled={isCheckingWebhooks}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isCheckingWebhooks ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Refresh Status
                      </>
                    )}
                  </button>
                </div>

                {/* Repository List with Webhook Status */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedRepositories.map((repo) => {
                    const status = webhookStatus[repo.full_name];
                    return (
                      <div
                        key={repo.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={repo.owner.avatar_url}
                            alt={repo.owner.login}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {repo.full_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {status?.status === 'checking' && (
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs">Checking...</span>
                            </div>
                          )}
                          {status?.status === 'configured' && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400" title={status.url}>
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Configured</span>
                            </div>
                          )}
                          {status?.status === 'missing' && (
                            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs">Not configured</span>
                            </div>
                          )}
                          {status?.status === 'error' && (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs">Error</span>
                            </div>
                          )}
                          {!status && (
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <span className="text-xs">Unknown</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Information Panel */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  How it works
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Cloudflare Worker receives webhook events from GitHub repositories</li>
                  <li>• Webhooks are automatically configured when you select repositories</li>
                  <li>• Real-time pull request events are processed and sent to your dashboard</li>
                  <li>• No manual configuration required - everything is automated</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Settings are monitored automatically
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}