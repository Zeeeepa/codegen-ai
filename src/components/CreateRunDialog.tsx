import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X, Rocket, Clipboard as ClipboardIcon, Loader } from "lucide-react";
import { getAPIClient } from "../api/client";
import { getAgentRunCache } from "../storage/agentRunCache";
import { validateCredentials } from "../utils/credentials";
import { OrganizationResponse } from "../api/types";
import { getBackgroundMonitoringService } from "../utils/backgroundMonitoring";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface CreateRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface FormValues {
  prompt: string;
  organizationId: string;
  attachClipboard: boolean;
}

export function CreateRunDialog({ isOpen, onClose, onCreated }: CreateRunDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    prompt: "",
    organizationId: "",
    attachClipboard: false,
  });

  const apiClient = getAPIClient();
  const cache = getAgentRunCache();
  const backgroundMonitoring = getBackgroundMonitoringService();
  const { userInfo } = useCurrentUser();

  // Create welcome message using full name or GitHub username
  const getWelcomeMessage = () => {
    if (!userInfo) return "Welcome! 👋";
    
    const name = userInfo.full_name || 
                 (userInfo.github_username ? userInfo.github_username : null) ||
                 "there";
    
    return `Welcome, ${name}! 👋`;
  };

  // Validate credentials and load organizations on mount
  useEffect(() => {
    if (!isOpen) return;

    async function initialize() {
      try {
        setIsLoadingOrgs(true);
        setValidationError(null);

        // Validate credentials first
        const validation = await validateCredentials();
        if (!validation.isValid) {
          setValidationError(validation.error || "Invalid credentials");
          return;
        }

        // Load organizations
        const orgs = await apiClient.getOrganizations();
        setOrganizations(orgs.items);

        // Set default organization
        if (validation.organizations && validation.organizations.length > 0) {
          const defaultOrg = validation.organizations[0];
          setFormValues(prev => ({
            ...prev,
            organizationId: defaultOrg.id.toString()
          }));
        }

      } catch (error) {
        console.error("Failed to initialize:", error);
        setValidationError(error instanceof Error ? error.message : "Failed to load organizations");
      } finally {
        setIsLoadingOrgs(false);
      }
    }

    initialize();
  }, [isOpen, apiClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formValues.prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!formValues.organizationId) {
      toast.error("Please select an organization");
      return;
    }

    setIsLoading(true);

    try {
      let finalPrompt = formValues.prompt.trim();

      // Attach clipboard content if requested
      if (formValues.attachClipboard) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText) {
            finalPrompt += `\n\nClipboard content:\n${clipboardText}`;
          }
        } catch (clipboardError) {
          console.warn("Failed to read clipboard:", clipboardError);
          toast.error("Failed to read clipboard content");
        }
      }

      // Create the agent run
      const response = await apiClient.createAgentRun(parseInt(formValues.organizationId), {
        prompt: finalPrompt,
      });

      // Add to cache and tracking
      await cache.updateAgentRun(parseInt(formValues.organizationId), response);
      await cache.addToTracking(parseInt(formValues.organizationId), response);

      // Start background monitoring if not already running
      if (!backgroundMonitoring.isMonitoring()) {
        backgroundMonitoring.start();
      }

      toast.success(`Agent run #${response.id} created successfully!`);
      
      // Reset form
      setFormValues({
        prompt: "",
        organizationId: formValues.organizationId, // Keep the selected org
        attachClipboard: false,
      });

      // Notify parent and close
      onCreated?.();
      onClose();

    } catch (error) {
      console.error("Failed to create agent run:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create agent run");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Rocket className="h-6 w-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Create Agent Run</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {validationError ? (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-300">{validationError}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Welcome Message */}
              <div className="text-center">
                <h3 className="text-lg font-medium text-white mb-2">{getWelcomeMessage()}</h3>
                <p className="text-gray-400 text-sm">
                  Create a new agent run to automate your tasks
                </p>
              </div>

              {/* Organization Selection */}
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-2">
                  Organization
                </label>
                {isLoadingOrgs ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="h-5 w-5 animate-spin text-blue-400" />
                    <span className="ml-2 text-gray-400">Loading organizations...</span>
                  </div>
                ) : (
                  <select
                    id="organization"
                    value={formValues.organizationId}
                    onChange={(e) => setFormValues(prev => ({ ...prev, organizationId: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select an organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id.toString()}>
                        {org.name} (ID: {org.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Prompt Input */}
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                  Prompt
                </label>
                <textarea
                  id="prompt"
                  value={formValues.prompt}
                  onChange={(e) => setFormValues(prev => ({ ...prev, prompt: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want the agent to do..."
                  className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to create
                </p>
              </div>

              {/* Clipboard Attachment */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="attachClipboard"
                  checked={formValues.attachClipboard}
                  onChange={(e) => setFormValues(prev => ({ ...prev, attachClipboard: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="attachClipboard" className="flex items-center text-sm text-gray-300">
                  <ClipboardIcon className="h-4 w-4 mr-2" />
                  Attach clipboard content to prompt
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !formValues.prompt.trim() || !formValues.organizationId}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Create Agent Run
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
