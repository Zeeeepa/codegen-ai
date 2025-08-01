import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, AlertCircle } from 'lucide-react';
import { CachedProject } from '../api/types';
import { getAPIClient } from '../api/client';
import { getProjectSettings } from '../storage/projectSettings';
import { getPreferenceValues } from '../utils/preferences';
import { associateAgentRunWithProject } from '../storage/projectCache';
import { validateCredentials } from '../utils/credentials';
import toast from 'react-hot-toast';

interface AgentRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: CachedProject;
  autoConfirm: boolean;
}

export function AgentRunDialog({ isOpen, onClose, project, autoConfirm }: AgentRunDialogProps) {
  const [target, setTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planningStatement, setPlanningStatement] = useState('');
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  const loadPlanningStatement = useCallback(async () => {
    try {
      const preferences = await getPreferenceValues();
      const projectSettings = await getProjectSettings(project.id);
      
      // Use project-specific planning statement if available, otherwise use global
      const statement = projectSettings.planningStatement || preferences.planningStatement || '';
      setPlanningStatement(statement);
    } catch (error) {
      console.error('Failed to load planning statement:', error);
    }
  }, [project.id]);

  // Load organization ID
  const loadOrganization = useCallback(async () => {
    try {
      const validation = await validateCredentials();
      if (validation.organizations && validation.organizations.length > 0) {
        setOrganizationId(validation.organizations[0].id);
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadPlanningStatement();
      loadOrganization();
    }
  }, [isOpen, loadPlanningStatement, loadOrganization]);



  const handleSubmit = async () => {
    if (!target.trim()) {
      toast.error('Please enter a target for the agent run');
      return;
    }

    setIsSubmitting(true);
    try {
      const apiClient = getAPIClient();
      
      // Construct the full prompt with planning statement and project context
      let fullPrompt = '';
      
      // Add planning statement if available
      if (planningStatement.trim()) {
        fullPrompt += `${planningStatement.trim()}\n\n`;
      }
      
      // Add project context
      fullPrompt += `Project: ${project.htmlUrl}\n\n`;
      
      // Add user target
      fullPrompt += target.trim();

      console.log('Creating agent run with prompt:', fullPrompt);

      // Create the agent run
      if (!organizationId) {
        throw new Error('No organization available');
      }
      
      const agentRun = await apiClient.createAgentRun(organizationId, {
        prompt: fullPrompt,
      });

      // Associate the agent run with the project
      await associateAgentRunWithProject(project.id, agentRun.id);

      toast.success(`Agent run created successfully! ID: ${agentRun.id}`);
      
      // Open the agent run in a new tab
      if (agentRun.web_url) {
        window.open(agentRun.web_url, '_blank');
      }

      // Reset form and close dialog
      setTarget('');
      onClose();
    } catch (error) {
      console.error('Failed to create agent run:', error);
      toast.error('Failed to create agent run. Please check your API configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Play className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Create Agent Run</h2>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Auto Confirm Notice */}
          {autoConfirm && (
            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                <p className="text-blue-300 text-sm">
                  Auto-confirm is enabled for this project. The agent will automatically confirm proposed plans.
                </p>
              </div>
            </div>
          )}

          {/* Planning Statement Preview */}
          {planningStatement && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Planning Statement (will be prepended to your target)
              </label>
              <div className="p-3 bg-gray-800 border border-gray-600 rounded-md">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {planningStatement}
                </p>
              </div>
            </div>
          )}

          {/* Project Context */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Project Context (automatically included)
            </label>
            <div className="p-3 bg-gray-800 border border-gray-600 rounded-md">
              <p className="text-sm text-gray-300">
                Project: {project.htmlUrl}
              </p>
            </div>
          </div>

          {/* Target Input */}
          <div className="space-y-2">
            <label htmlFor="target" className="block text-sm font-medium text-gray-300">
              Target *
            </label>
            <textarea
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Describe what you want the agent to accomplish in this project..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={6}
            />
            <p className="text-xs text-gray-500">
              Be specific about what you want the agent to do. This will be combined with the planning statement and project context.
            </p>
          </div>

          {/* Full Prompt Preview */}
          {target.trim() && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Full Prompt Preview
              </label>
              <div className="p-3 bg-gray-800 border border-gray-600 rounded-md max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                  {planningStatement.trim() && `${planningStatement.trim()}\n\n`}
                  Project: {project.htmlUrl}
                  {'\n\n'}
                  {target.trim()}
                </pre>
              </div>
            </div>
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
            onClick={handleSubmit}
            disabled={!target.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Agent Run'}
          </button>
        </div>
      </div>
    </div>
  );
}
