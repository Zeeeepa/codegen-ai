import React from 'react';
import { Eye, Plus } from 'lucide-react';
import { useAgentRunSelection } from '../contexts/AgentRunSelectionContext';
import { getAgentRunCache } from '../storage/agentRunCache';
import toast from 'react-hot-toast';

interface MonitorSelectedButtonProps {
  organizationId: number;
  onMonitoringComplete?: () => void;
}

export function MonitorSelectedButton({ organizationId, onMonitoringComplete }: MonitorSelectedButtonProps) {
  const { selectedRunsData, selectionCount, clearSelection } = useAgentRunSelection();

  const handleMonitorSelected = async () => {
    if (selectionCount === 0) {
      toast.error('No agent runs selected');
      return;
    }

    try {
      const cache = getAgentRunCache();
      let successCount = 0;
      let errorCount = 0;

      toast.loading(`Adding ${selectionCount} agent run${selectionCount > 1 ? 's' : ''} to monitoring...`);

      // Add each selected run to monitoring
      for (const run of selectedRunsData) {
        try {
          // Update the run in cache and add to tracking
          await cache.updateAgentRun(organizationId, run);
          await cache.addToTracking(organizationId, run);
          successCount++;
        } catch (error) {
          console.error(`Failed to add agent run #${run.id} to monitoring:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(
          `Successfully added ${successCount} agent run${successCount > 1 ? 's' : ''} to monitoring! ` +
          `You'll get notifications for status changes.`
        );
      }

      if (errorCount > 0) {
        toast.error(`Failed to add ${errorCount} agent run${errorCount > 1 ? 's' : ''} to monitoring`);
      }

      // Clear selection after successful monitoring
      if (successCount > 0) {
        clearSelection();
      }

      // Notify parent component
      if (onMonitoringComplete) {
        onMonitoringComplete();
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add agent runs to monitoring');
    }
  };

  if (selectionCount === 0) {
    return null;
  }

  return (
    <button
      onClick={handleMonitorSelected}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 transition-colors"
      title={`Monitor ${selectionCount} selected agent run${selectionCount > 1 ? 's' : ''}`}
    >
      <Eye className="h-4 w-4 mr-2" />
      Monitor Selected ({selectionCount})
    </button>
  );
}

interface AddToMonitorButtonProps {
  organizationId: number;
  onAddComplete?: () => void;
}

export function AddToMonitorButton({ organizationId, onAddComplete }: AddToMonitorButtonProps) {
  const handleAddFromClipboard = async () => {
    try {
      // Get clipboard content
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText) {
        toast.error("Copy Agent Run ID First");
        return;
      }

      let suggestedInput = "";

      // Try to extract agent run ID from various URL formats
      const urlPatterns = [
        /codegen\.com\/agent\/trace\/(\d+)/,
        /codegen\.sh\/agent\/trace\/(\d+)/,
        /\/agent\/trace\/(\d+)/,
        /agent_run_id[=:](\d+)/,
        /run[_-]?id[=:](\d+)/i,
      ];

      for (const pattern of urlPatterns) {
        const match = clipboardText.match(pattern);
        if (match && match[1]) {
          suggestedInput = match[1];
          console.log(`✅ Extracted agent run ID from URL: ${suggestedInput}`);
          break;
        }
      }
      
      // If no URL match, check if it's just a number
      if (!suggestedInput && /^\d+$/.test(clipboardText.trim())) {
        suggestedInput = clipboardText.trim();
        console.log("✅ Using direct agent run ID:", suggestedInput);
      }

      if (!suggestedInput) {
        toast.error("Copy Agent Run ID First");
        console.log("Copy an agent run ID or Codegen URL to your clipboard first, then try again.");
        return;
      }

      // Parse the agent run ID
      const agentRunId = parseInt(suggestedInput, 10);

      toast.loading(`Fetching details for agent run #${agentRunId}...`);

      // Fetch the agent run from the API
      const { getAPIClient } = await import('../api/client');
      const apiClient = getAPIClient();
      const agentRun = await apiClient.getAgentRun(organizationId, agentRunId);
      
      // Add to cache and tracking
      const cache = getAgentRunCache();
      await cache.updateAgentRun(organizationId, agentRun);
      await cache.addToTracking(organizationId, agentRun);

      toast.success(`Now monitoring agent run #${agentRunId} - you'll get notifications for status changes`);

      // Notify parent component
      if (onAddComplete) {
        onAddComplete();
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not fetch or add the agent run");
    }
  };

  return (
    <button
      onClick={handleAddFromClipboard}
      className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
      title="Add agent run from clipboard to monitoring"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add to Monitor
    </button>
  );
}
