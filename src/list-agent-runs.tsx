import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { 
  Play, 
  Square, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Trash2, 
  Filter, 
  Plus, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  FileText
} from "lucide-react";
import { useAgentRunSelection } from "./contexts/AgentRunSelectionContext";
import { useDialog } from "./contexts/DialogContext";
import { AgentRunResponseModal } from "./components/AgentRunResponseModal";
import { ResumeAgentRunDialog } from "./components/ResumeAgentRunDialog";
import { CreateRunDialog } from "./components/CreateRunDialog";
import { useCachedAgentRuns } from "./hooks/useCachedAgentRuns";
import { getAPIClient } from "./api/client";
import { getAgentRunCache } from "./storage/agentRunCache";
import { AgentRunStatus, CachedAgentRun } from "./api/types";
import { getDateRanges, getStatusFilterOptions, hasActiveFilters, clearFilters } from "./utils/filtering";
import { SyncStatus } from "./storage/cacheTypes";

export default function ListAgentRuns() {
  const {
    filteredRuns,
    isLoading,
    isRefreshing,
    error,
    syncStatus,
    refresh,
    updateFilters,
    filters,
    organizationId,
  } = useCachedAgentRuns();

  const selection = useAgentRunSelection();
  const { openDialog, closeDialog, isDialogOpen, dialogData } = useDialog();
  const [searchText, setSearchText] = useState("");
  const [dateRanges] = useState(() => getDateRanges());
  const [responseModalRun, setResponseModalRun] = useState<CachedAgentRun | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const apiClient = getAPIClient();
  const cache = getAgentRunCache();

  // Memoize status filter options to prevent infinite loops
  const statusFilterOptions = useMemo(() => {
    return getStatusFilterOptions(filteredRuns);
  }, [filteredRuns]);

  // Initialize component - only run once
  useEffect(() => {
    console.log('Agent runs component initialized');
  }, []); // Empty dependency array - only run once

  // Update search filter when search text changes - memoized to prevent re-renders
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    updateFilters({
      ...filters,
      searchQuery: text,
    });
  }, [filters, updateFilters]);

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "running":
        return Clock;
      case "complete":
      case "completed":
        return CheckCircle;
      case "failed":
      case "error":
        return XCircle;
      case "cancelled":
      case "stopped":
        return Square;
      case "paused":
        return Pause;
      case "pending":
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "running":
        return "text-blue-600";
      case "complete":
      case "completed":
        return "text-green-600";
      case "failed":
      case "error":
        return "text-red-600";
      case "cancelled":
      case "stopped":
        return "text-gray-500";
      case "paused":
        return "text-yellow-600";
      case "pending":
        return "text-blue-400";
      default:
        return "text-gray-500";
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    return {
      icon: getStatusIcon(status),
      color: getStatusColor(status),
    };
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Stop an agent run
  const stopAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    const confirmed = window.confirm(`Are you sure you want to stop agent run #${agentRunId}?`);
    
    if (!confirmed) return;

    try {
      await apiClient.stopAgentRun(organizationId, { agent_run_id: agentRunId });
      
      toast.success(`Agent run #${agentRunId} has been stopped`);

      // Refresh to get updated status
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop agent run");
    }
  };

  // Resume an agent run - now opens dialog for user input
  const resumeAgentRun = (agentRunId: number) => {
    if (!organizationId) return;
    
    // Open the resume dialog with the agent run ID
    openDialog('resume-run', { agentRunId, organizationId });
  };

  // Respond to an agent run (for stopped/failed runs)
  const respondToAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    const prompt = window.prompt(
      `Enter your response to agent run #${agentRunId}:`,
      "Please continue with the task"
    );
    
    if (!prompt || !prompt.trim()) return;

    try {
      // Try resume endpoint first (it might work for stopped runs too)
      await apiClient.resumeAgentRun(organizationId, agentRunId, {
        prompt: prompt.trim(),
      });

      toast.success(`Response sent to agent run #${agentRunId}`);

      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to respond to agent run");
    }
  };



  // Delete an agent run
  const deleteAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    if (!window.confirm(`Are you sure you want to delete agent run #${agentRunId}? This will remove it from your local cache.`)) return;

    try {
      // Remove from cache
      await cache.removeAgentRun(organizationId, agentRunId);
      
      toast.success(`Agent run #${agentRunId} has been removed`);

      // Refresh to update the list
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete agent run");
    }
  };

  // Clear all filters - memoized
  const handleClearFilters = useCallback(() => {
    updateFilters(clearFilters());
    setSearchText("");
  }, [updateFilters]);

  // Filter by status - memoized
  const filterByStatus = useCallback((status: AgentRunStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    updateFilters({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  }, [filters, updateFilters]);

  // Get sync status display
  const getSyncStatusAccessory = () => {
    switch (syncStatus) {
      case SyncStatus.SYNCING:
        return { icon: RefreshCw, tooltip: "Syncing..." };
      case SyncStatus.ERROR:
        return { icon: AlertCircle, tooltip: "Sync failed" };
      case SyncStatus.SUCCESS:
        return { icon: CheckCircle, tooltip: "Synced" };
      default:
        return undefined;
    }
  };

  if (error && !isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Agent Runs</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={refresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {/* Header with search and filters */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">Agent Runs</h1>
              {(() => {
                const syncStatusDisplay = getSyncStatusAccessory();
                if (syncStatusDisplay) {
                  const { icon: SyncIcon, tooltip } = syncStatusDisplay;
                  return (
                    <div className="flex items-center" title={tooltip}>
                      <SyncIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Agent Run
              </button>
              {selection.hasSelection && (
                <button
                  onClick={selection.clearSelection}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                  title="Clear selection"
                >
                  Clear ({selection.selectionCount})
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search agent runs..."
                value={searchText}
                onChange={(e) => handleSearchTextChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={filters.status || 'all'}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    updateFilters({ ...filters, status: undefined });
                  } else {
                    filterByStatus(e.target.value as AgentRunStatus);
                  }
                }}
                className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                {statusFilterOptions.map(({ status, count, label }) => (
                  <option key={status} value={status}>
                    {label} ({count})
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters(filters) && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </button>
            )}
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Date Range Filter */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date Range</label>
            <select
              onChange={(e) => {
                const selectedRange = e.target.value;
                if (selectedRange === 'all') {
                  updateFilters({ ...filters, dateRange: undefined });
                } else {
                  const range = dateRanges[selectedRange as keyof typeof dateRanges];
                  if (range) {
                    updateFilters({ ...filters, dateRange: range });
                  }
                }
              }}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisWeek">This Week</option>
              <option value="lastWeek">Last Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last30Days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading agent runs...</p>
          </div>
        )}

        {/* Empty state */}
        {filteredRuns.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              {hasActiveFilters(filters) ? <Filter className="h-12 w-12" /> : <Plus className="h-12 w-12" />}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {hasActiveFilters(filters) ? "No Matching Agent Runs" : "No Agent Runs"}
            </h3>
            <p className="text-gray-600 mb-6">
              {hasActiveFilters(filters)
                ? "Try adjusting your search or filters"
                : "Create your first agent run to get started"}
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Agent Run
              </button>
              {hasActiveFilters(filters) && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Agent runs list */}
        {filteredRuns.length > 0 && !isLoading && (
          <div className="divide-y divide-gray-200">
            {filteredRuns.map((run) => {
              const statusDisplay = getStatusDisplay(run.status);
              const StatusIcon = statusDisplay.icon;
              const canStop = run.status === AgentRunStatus.ACTIVE;
              const canResume = run.status === AgentRunStatus.PAUSED || 
                                run.status === AgentRunStatus.COMPLETE ||
                                run.status.toLowerCase() === 'stopped' ||
                                run.status.toLowerCase() === 'paused';
              const canRespond = [
                AgentRunStatus.FAILED,
                AgentRunStatus.ERROR,
                AgentRunStatus.CANCELLED,
                AgentRunStatus.TIMEOUT,
                AgentRunStatus.MAX_ITERATIONS_REACHED,
                AgentRunStatus.OUT_OF_TOKENS
              ].includes(run.status as AgentRunStatus) && 
              run.status.toLowerCase() !== 'stopped'; // Don't show respond button for stopped runs

              const isSelected = selection.isSelected(run.id);
              const canViewResponse = run.status === AgentRunStatus.COMPLETE && run.result;
              
              // Convert AgentRunResponse to CachedAgentRun for selection
              const cachedRun: CachedAgentRun = {
                ...run,
                lastUpdated: new Date().toISOString(),
                organizationName: undefined, // Will be populated by cache if available
                isPolling: false
              };

              return (
                <div 
                  key={run.id} 
                  className={`p-6 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-900 border-blue-500 shadow-lg' 
                      : 'bg-black border-gray-700 hover:bg-gray-800 hover:shadow-md'
                  }`}
                  onClick={() => selection.toggleRun(run.id, cachedRun)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => selection.toggleRun(run.id, cachedRun)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <StatusIcon className={`h-5 w-5 ${statusDisplay.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-white">Agent Run #{run.id}</h3>
                          {/* Monitoring indicator */}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-500/30">
                            🔍 Monitored
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created {formatDate(run.created_at)}</span>
                          {run.result && (
                            <span className="text-blue-400">• Has Response</span>
                          )}
                          {run.web_url && (
                            <span className="text-purple-400">• Web URL Available</span>
                          )}
                        </div>
                        {/* Show brief result preview if available */}
                        {run.result && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2 max-w-md">
                            {run.result.length > 100 ? `${run.result.substring(0, 100)}...` : run.result}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color.replace('text-', 'bg-').replace('-600', '-100')} ${statusDisplay.color}`}>
                        {run.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {canViewResponse && (
                        <button
                          onClick={() => setResponseModalRun(cachedRun)}
                          className="inline-flex items-center px-3 py-1.5 border border-green-600 text-sm font-medium rounded text-green-300 bg-green-900 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800"
                          title="View Response"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => window.open(run.web_url, '_blank')}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                        title="Open in Browser"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => copyToClipboard(run.web_url, 'Web URL copied to clipboard')}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                        title="Copy Web URL (Cmd+C)"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      
                      {canStop && (
                        <button
                          onClick={() => stopAgentRun(run.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-600 text-sm font-medium rounded text-red-300 bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
                          title="Stop Agent Run (Cmd+S)"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      )}
                      
                      {canResume && (
                        <button
                          onClick={() => resumeAgentRun(run.id)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 border text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                            run.status.toLowerCase() === 'stopped' 
                              ? 'border-green-500 text-green-200 bg-green-700 hover:bg-green-600 focus:ring-green-400' 
                              : 'border-green-600 text-green-300 bg-green-900 hover:bg-green-800 focus:ring-green-500'
                          }`}
                          title="Resume Agent Run (Cmd+R)"
                        >
                          <Play className="h-4 w-4" />
                          {run.status.toLowerCase() === 'stopped' ? 'Resume Agent Run' : ''}
                        </button>
                      )}
                      
                      {canRespond && (
                        <button
                          onClick={() => respondToAgentRun(run.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm font-medium rounded text-blue-300 bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                          title="Respond to Agent Run"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteAgentRun(run.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-600 text-sm font-medium rounded text-red-300 bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
                        title="Delete Agent Run (Cmd+Shift+Delete)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Response Modal */}
        {responseModalRun && (
          <AgentRunResponseModal
            run={responseModalRun}
            isOpen={!!responseModalRun}
            onClose={() => setResponseModalRun(null)}
          />
        )}
        
        {/* Resume Agent Run Dialog */}
        {isDialogOpen('resume-run') && dialogData && (
          <ResumeAgentRunDialog
            isOpen={isDialogOpen('resume-run')}
            onClose={closeDialog}
            agentRunId={dialogData.agentRunId}
            organizationId={dialogData.organizationId}
            onResumed={refresh}
          />
        )}

        {/* Create Agent Run Dialog */}
        <CreateRunDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreated={refresh}
        />
      </div>
    </div>
  );
}
