import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Rocket, Clipboard as ClipboardIcon, Settings } from "lucide-react";
import { getAPIClient } from "./api/client";
import { getAgentRunCache } from "./storage/agentRunCache";
import { validateCredentials, hasCredentials } from "./utils/credentials";
import { OrganizationResponse } from "./api/types";
import { useCachedAgentRuns } from "./hooks/useCachedAgentRuns";
import { getBackgroundMonitoringService } from "./utils/backgroundMonitoring";
import { useCurrentUser } from "./hooks/useCurrentUser";

interface FormValues {
  prompt: string;
  organizationId: string;
  attachClipboard: boolean;
}



export default function CreateAgentRun() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [defaultOrgId, setDefaultOrgId] = useState<string | null>(null);
  const { refresh } = useCachedAgentRuns();


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
    async function initialize() {
      if (!hasCredentials()) {
        setValidationError("API token not configured. Please set it in extension preferences.");
        setIsLoadingOrgs(false);
        return;
      }

      try {
        // Load cached organizations and default from local storage
        const cachedDefaultOrgId = localStorage.getItem("defaultOrganizationId");
        const cachedDefaultOrg = localStorage.getItem("defaultOrganization");
        
        if (cachedDefaultOrgId) {
          setDefaultOrgId(cachedDefaultOrgId);
        }
        
        // Use cached default organization if available
        if (cachedDefaultOrg) {
          try {
            const defaultOrg: OrganizationResponse = JSON.parse(cachedDefaultOrg);
            if (defaultOrg.id && defaultOrg.name && defaultOrg.settings) {
              setOrganizations([defaultOrg]);
            }
          } catch (parseError) {
            console.log("Could not parse cached default organization:", parseError);
          }
        }

        // Validate credentials and get organizations from API
        const validation = await validateCredentials();
        if (!validation.isValid) {
          setValidationError(validation.error || "Invalid credentials");
          setIsLoadingOrgs(false);
          return;
        }

        // Load organizations from validation result (which fetches from API)
        if (validation.organizations && validation.organizations.length > 0) {
          // Convert basic organizations to full OrganizationResponse format
          const fullOrganizations: OrganizationResponse[] = validation.organizations.map(org => ({
            id: org.id,
            name: org.name,
            settings: {
              enable_pr_creation: true,
              enable_rules_detection: true
            }
          }));
          
          setOrganizations(fullOrganizations);
          
          // If no default org is set but we have organizations, set the first one as default
          if (!cachedDefaultOrgId && fullOrganizations.length > 0) {
            const firstOrg = fullOrganizations[0];
            setDefaultOrgId(firstOrg.id.toString());
            localStorage.setItem("defaultOrganizationId", firstOrg.id.toString());
            localStorage.setItem("defaultOrganization", JSON.stringify(firstOrg));
          }
        }
          
        // TODO: Re-enable user profile fetching later
        // Try to get user's first name for personalization
        // try {
        //   const credentials = getCredentials();
        //   const firstOrgId = validation.organizations[0]?.id;
        //   const userId = credentials.userId ? parseInt(credentials.userId, 10) : undefined;
        //   
        //   if (firstOrgId) {
        //     const firstName = await getCurrentUserFirstName(firstOrgId, userId);
        //     setUserFirstName(firstName);
        //   }
        // } catch (error) {
        //   console.log("Could not fetch user name:", error);
        //   // Keep default "User" name
        // }
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : "Failed to validate credentials");
      } finally {
        setIsLoadingOrgs(false);
      }
    }

    initialize();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!values.prompt.trim()) {
      toast.error("I need a description of what you want me to create");
      return;
    }

    if (!values.organizationId) {
      toast.error("I need to know which organization to create this in");
      return;
    }

    setIsLoading(true);

    try {
      const organizationId = parseInt(values.organizationId, 10);
      let prompt = values.prompt.trim();

      // Attach clipboard content if requested
      if (values.attachClipboard) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && clipboardText.trim()) {
            prompt += `\n\n--- Additional Context ---\n${clipboardText}`;
          }
        } catch (error) {
          console.warn("Failed to read clipboard:", error);
        }
      }

      // Create the agent run
      const agentRun = await apiClient.createAgentRun(organizationId, {
        prompt,
      });

      // Cache the new agent run
      await cache.updateAgentRun(organizationId, agentRun);

      // Add to tracking for notifications
      await cache.addToTracking(organizationId, agentRun);

      // Start background monitoring if not already running
      if (!backgroundMonitoring.isMonitoring()) {
        backgroundMonitoring.start();
      }

      // Refresh the list view to show the new run
      await refresh();

      toast.success(`Starting agent run #${agentRun.id} - I'll let you know when it's done`, {
        duration: 5000,
      });

      navigate(-1);
    } catch (error) {
      console.error("Failed to create agent run:", error);
      
      toast.error(error instanceof Error ? error.message : "Something went wrong, let's try that again");
    } finally {
      setIsLoading(false);
    }
  }

  const [formData, setFormData] = useState<FormValues>({
    prompt: '',
    organizationId: '',
    attachClipboard: false
  });

  // Update form data when default organization changes
  useEffect(() => {
    if (defaultOrgId && !formData.organizationId) {
      setFormData(prev => ({
        ...prev,
        organizationId: defaultOrgId
      }));
    }
  }, [defaultOrgId, formData.organizationId]);

  if (validationError) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-black rounded-lg border border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Let's get you set up</h1>
          
          <div className="text-center py-8">
            <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              I need your API token to get started. Once you add it, we can build some amazing things together!
            </p>
            <p className="text-red-600 mb-6">{validationError}</p>
            <button
              onClick={() => window.open('/settings', '_blank')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure API Token
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(formData);
  };

  const handleClipboardAction = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText.trim()) {
        setFormData(prev => ({ ...prev, prompt: prev.prompt + '\n\n' + clipboardText }));
        toast.success("Clipboard content added to prompt");
      }
    } catch (error) {
      toast.error("Could not read clipboard content");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="bg-black rounded-lg border border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">What are we building today?</h1>
        
        {(isLoading || isLoadingOrgs) && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        )}
        
        <div className="mb-6">
          <p className="text-gray-600">{getWelcomeMessage()}</p>
        </div>
        
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div>
            <label htmlFor="prompt" className="sr-only">Prompt</label>
            <textarea
              id="prompt"
              rows={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="What are we building today?"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: (e.target as HTMLTextAreaElement).value }))}
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="attachClipboard"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.attachClipboard}
              onChange={(e) => setFormData(prev => ({ ...prev, attachClipboard: (e.target as HTMLInputElement).checked }))}
            />
            <label htmlFor="attachClipboard" className="ml-2 block text-sm text-white">
              Include what's on my clipboard for context
            </label>
          </div>

          <div>
            <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-2">
              Organization
            </label>
            <select
              id="organizationId"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.organizationId}
              onChange={(e) => setFormData(prev => ({ ...prev, organizationId: (e.target as HTMLSelectElement).value }))}
              required
            >
              <option value="">Choose org</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id.toString()}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={isLoading || isLoadingOrgs}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Let's Build This
            </button>
            
            <button
              type="button"
              onClick={handleClipboardAction}
              className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
              title="Add from Clipboard (Cmd+V)"
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
