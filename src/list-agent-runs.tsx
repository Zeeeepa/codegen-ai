/**
 * Agent runs listing and management component
 * Displays agent runs with filtering, sorting, and real-time updates
 */

import React, { useState, useEffect } from 'react';
import { useCachedAgentRuns, type AgentRun, type AgentRunFilters } from './hooks/useCachedAgentRuns';
import { preferences } from './utils/preferences';
import { toast } from './utils/toast';
import { Card, Button, Input, Badge, LoadingSpinner, Pagination } from './components/ui';
import { 
  SearchIcon, 
  FilterIcon, 
  RefreshIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  MoreVerticalIcon
} from './components/icons';

interface ListAgentRunsState {
  selectedRuns: string[];
  showFilters: boolean;
  sortBy: 'createdAt' | 'updatedAt' | 'status' | 'target';
  sortOrder: 'asc' | 'desc';
}

interface ListAgentRunsProps {
  organizationId: string;
  repositoryId?: string;
  onAgentRunSelect?: (agentRun: AgentRun) => void;
  onCreateAgentRun?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const STATUS_ICONS = {
  pending: ClockIcon,
  running: PlayIcon,
  completed: CheckCircleIcon,
  failed: XCircleIcon,
  cancelled: StopIcon
};

export const ListAgentRuns: React.FC<ListAgentRunsProps> = ({
  organizationId,
  repositoryId,
  onAgentRunSelect,
  onCreateAgentRun,
  showActions = true,
  compact = false
}) => {
  const [state, setState] = useState<ListAgentRunsState>({
    selectedRuns: [],
    showFilters: false,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [filters, setFilters] = useState<AgentRunFilters>({
    organizationId,
    repositoryId
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  const {
    runs,
    loading,
    error,
    hasMore,
    total,
    refresh,
    loadMore,
    updateAgentRun,
    page,
    pageSize
  } = useCachedAgentRuns(filters, {
    autoRefresh: preferences.getPreference('enableRealTimeUpdates'),
    refreshInterval: preferences.getPreference('autoRefreshInterval'),
    enableRealTime: preferences.getPreference('enableRealTimeUpdates')
  });

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({
      ...prev,
      search: query || undefined
    }));
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : [status as AgentRun['status']]
    }));
  };

  // Handle date range filter
  const handleDateRangeFilter = (range: string) => {
    setDateRange(range);
    let dateRangeFilter: { start: number; end: number } | undefined;

    if (range !== 'all') {
      const now = Date.now();
      const ranges = {
        'today': { start: now - 24 * 60 * 60 * 1000, end: now },
        'week': { start: now - 7 * 24 * 60 * 60 * 1000, end: now },
        'month': { start: now - 30 * 24 * 60 * 60 * 1000, end: now }
      };
      dateRangeFilter = ranges[range as keyof typeof ranges];
    }

    setFilters(prev => ({
      ...prev,
      dateRange: dateRangeFilter
    }));
  };

  // Handle agent run selection
  const handleAgentRunClick = (agentRun: AgentRun) => {
    onAgentRunSelect?.(agentRun);
  };

  // Handle bulk selection
  const handleSelectRun = (runId: string, selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedRuns: selected
        ? [...prev.selectedRuns, runId]
        : prev.selectedRuns.filter(id => id !== runId)
    }));
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedRuns: selected ? runs.map(run => run.id) : []
    }));
  };

  // Cancel selected runs
  const handleCancelSelected = async () => {
    if (state.selectedRuns.length === 0) return;

    try {
      // Mock API calls to cancel runs
      await Promise.all(
        state.selectedRuns.map(async (runId) => {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 200));
          updateAgentRun(runId, { status: 'cancelled', updatedAt: Date.now() });
        })
      );

      toast.success('Runs Cancelled', `${state.selectedRuns.length} agent runs have been cancelled`);
      setState(prev => ({ ...prev, selectedRuns: [] }));

    } catch (error) {
      toast.error('Cancellation Failed', 'Failed to cancel selected agent runs');
    }
  };

  // Format duration
  const formatDuration = (duration?: number): string => {
    if (!duration) return 'N/A';
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Get progress percentage
  const getProgressPercentage = (run: AgentRun): number => {
    if (run.progress) {
      return run.progress.percentage;
    }
    
    // Fallback based on status
    switch (run.status) {
      case 'completed': return 100;
      case 'failed':
      case 'cancelled': return 0;
      case 'running': return Math.random() * 80 + 10; // Mock progress
      default: return 0;
    }
  };

  // Sort runs
  const sortedRuns = [...runs].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (state.sortBy) {
      case 'createdAt':
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case 'updatedAt':
        aValue = a.updatedAt;
        bValue = b.updatedAt;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'target':
        aValue = a.target.toLowerCase();
        bValue = b.target.toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (state.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading && runs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading agent runs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <AlertCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Failed to load agent runs</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Runs</h2>
          <p className="text-gray-600 mt-1">
            {total > 0 ? `${total} total runs` : 'No agent runs found'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {showActions && (
            <>
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {onCreateAgentRun && (
                <Button onClick={onCreateAgentRun}>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Create Run
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search agent runs..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => handleDateRangeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <select
            value={`${state.sortBy}-${state.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setState(prev => ({
                ...prev,
                sortBy: sortBy as ListAgentRunsState['sortBy'],
                sortOrder: sortOrder as ListAgentRunsState['sortOrder']
              }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="status-asc">Status A-Z</option>
            <option value="target-asc">Target A-Z</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {state.selectedRuns.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-blue-800 font-medium">
            {state.selectedRuns.length} run{state.selectedRuns.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <Button onClick={handleCancelSelected} variant="outline" size="sm">
              Cancel Selected
            </Button>
            <Button 
              onClick={() => setState(prev => ({ ...prev, selectedRuns: [] }))} 
              variant="outline" 
              size="sm"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Agent Runs List */}
      {sortedRuns.length === 0 ? (
        <div className="text-center py-12">
          <PlayIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">No agent runs found</p>
          <p className="text-gray-500 text-sm mt-1">
            {searchQuery || statusFilter !== 'all' || dateRange !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first agent run to get started'
            }
          </p>
          {onCreateAgentRun && (
            <Button onClick={onCreateAgentRun} className="mt-4">
              <PlayIcon className="w-4 h-4 mr-2" />
              Create Agent Run
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          {showActions && (
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={state.selectedRuns.length === sortedRuns.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>Select all visible runs</span>
              </label>
            </div>
          )}

          {/* Runs Grid */}
          <div className={compact ? 'space-y-2' : 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'}>
            {sortedRuns.map(run => {
              const StatusIcon = STATUS_ICONS[run.status];
              const progress = getProgressPercentage(run);
              
              return (
                <Card
                  key={run.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    state.selectedRuns.includes(run.id) ? 'ring-2 ring-blue-500' : ''
                  } ${compact ? 'p-4' : ''}`}
                  onClick={() => handleAgentRunClick(run)}
                >
                  <div className={compact ? 'flex items-center space-x-4' : 'p-6'}>
                    {/* Selection Checkbox */}
                    {showActions && (
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={state.selectedRuns.includes(run.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRun(run.id, e.target.checked);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className="w-5 h-5 text-gray-400" />
                          <Badge className={STATUS_COLORS[run.status]}>
                            {run.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(run.createdAt)}
                        </span>
                      </div>

                      {/* Target */}
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {run.target}
                      </h3>

                      {/* Description */}
                      {run.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {run.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      {run.status === 'running' && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {run.tags && run.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {run.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {run.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{run.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{formatDuration(run.duration)}</span>
                          </div>
                          {run.repositoryId && (
                            <span className="truncate">
                              Repo: {run.repositoryId}
                            </span>
                          )}
                        </div>
                        <span>ID: {run.id.slice(-8)}</span>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    {!compact && (
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle actions menu
                          }}
                        >
                          <MoreVerticalIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <Button
                onClick={loadMore}
                variant="outline"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListAgentRuns;

