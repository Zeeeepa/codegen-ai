/**
 * Custom hook for managing cached agent runs
 * Provides caching, real-time updates, and state management for agent runs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../utils/storage';
import { preferences } from '../utils/preferences';
import { notifications } from '../utils/notifications';

export interface AgentRun {
  id: string;
  organizationId: string;
  repositoryId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  target: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  
  // Agent execution details
  steps?: AgentStep[];
  logs?: AgentLog[];
  plan?: AgentPlan;
  result?: AgentResult;
  
  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Progress tracking
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  output?: string;
  error?: string;
}

export interface AgentLog {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface AgentPlan {
  id: string;
  title: string;
  description: string;
  steps: AgentPlanStep[];
  estimatedDuration?: number;
  confidence: number;
  approved: boolean;
  approvedAt?: number;
}

export interface AgentPlanStep {
  id: string;
  title: string;
  description: string;
  confidence: number;
  dependencies?: string[];
  estimatedDuration?: number;
}

export interface AgentResult {
  success: boolean;
  summary: string;
  artifacts?: AgentArtifact[];
  pullRequests?: string[];
  metrics?: Record<string, number>;
}

export interface AgentArtifact {
  id: string;
  type: 'file' | 'pr' | 'deployment' | 'report';
  name: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface AgentRunFilters {
  status?: AgentRun['status'][];
  organizationId?: string;
  repositoryId?: string;
  tags?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
  search?: string;
}

export interface AgentRunsState {
  runs: AgentRun[];
  loading: boolean;
  error?: string;
  lastUpdated?: number;
  hasMore: boolean;
  total: number;
}

export interface UseCachedAgentRunsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxCacheSize?: number;
  enableRealTime?: boolean;
}

export function useCachedAgentRuns(
  filters: AgentRunFilters = {},
  options: UseCachedAgentRunsOptions = {}
) {
  const [state, setState] = useState<AgentRunsState>({
    runs: [],
    loading: true,
    hasMore: true,
    total: 0
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(preferences.getPreference('agentRunsPerPage'));
  
  const cacheKeyRef = useRef<string>('');
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Generate cache key based on filters
  const generateCacheKey = useCallback((filters: AgentRunFilters, page: number): string => {
    const filterString = JSON.stringify({ ...filters, page, pageSize });
    return `agent_runs_${btoa(filterString)}`;
  }, [pageSize]);

  // Load cached data
  const loadFromCache = useCallback((cacheKey: string): AgentRunsState | null => {
    const cached = storage.get<AgentRunsState>(cacheKey);
    if (!cached) return null;

    const cacheExpiration = preferences.getPreference('cacheExpirationHours') * 60 * 60 * 1000;
    const isExpired = cached.lastUpdated && (Date.now() - cached.lastUpdated) > cacheExpiration;
    
    return isExpired ? null : cached;
  }, []);

  // Save to cache
  const saveToCache = useCallback((cacheKey: string, data: AgentRunsState): void => {
    const maxCacheSize = preferences.getPreference('maxCachedAgentRuns');
    const dataToCache = {
      ...data,
      runs: data.runs.slice(0, maxCacheSize),
      lastUpdated: Date.now()
    };
    
    storage.set(cacheKey, dataToCache, { ttl: preferences.getPreference('cacheExpirationHours') * 60 * 60 * 1000 });
  }, []);

  // Fetch agent runs from API
  const fetchAgentRuns = useCallback(async (
    filters: AgentRunFilters,
    page: number,
    signal?: AbortSignal
  ): Promise<{ runs: AgentRun[]; total: number; hasMore: boolean }> => {
    // This would be replaced with actual API call
    const mockResponse = await new Promise<{ runs: AgentRun[]; total: number; hasMore: boolean }>((resolve) => {
      setTimeout(() => {
        const mockRuns: AgentRun[] = Array.from({ length: Math.min(pageSize, 50) }, (_, i) => ({
          id: `run-${page}-${i}`,
          organizationId: filters.organizationId || 'org-1',
          repositoryId: filters.repositoryId,
          status: ['pending', 'running', 'completed', 'failed'][Math.floor(Math.random() * 4)] as AgentRun['status'],
          target: `Task ${page}-${i}`,
          description: `Description for task ${page}-${i}`,
          createdAt: Date.now() - Math.random() * 86400000,
          updatedAt: Date.now() - Math.random() * 3600000,
          progress: {
            current: Math.floor(Math.random() * 10),
            total: 10,
            percentage: Math.floor(Math.random() * 100)
          }
        }));

        resolve({
          runs: mockRuns,
          total: 150,
          hasMore: page * pageSize < 150
        });
      }, 500);
    });

    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    return mockResponse;
  }, [pageSize]);

  // Load agent runs
  const loadAgentRuns = useCallback(async (
    filters: AgentRunFilters,
    page: number,
    useCache: boolean = true
  ): Promise<void> => {
    const cacheKey = generateCacheKey(filters, page);
    cacheKeyRef.current = cacheKey;

    // Try to load from cache first
    if (useCache) {
      const cached = loadFromCache(cacheKey);
      if (cached) {
        setState(cached);
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const { runs, total, hasMore } = await fetchAgentRuns(filters, page, abortControllerRef.current.signal);

      const newState: AgentRunsState = {
        runs: page === 1 ? runs : [...state.runs, ...runs],
        loading: false,
        hasMore,
        total,
        lastUpdated: Date.now()
      };

      setState(newState);
      saveToCache(cacheKey, newState);

    } catch (error) {
      if (error instanceof Error && error.message !== 'Request aborted') {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }
  }, [generateCacheKey, loadFromCache, saveToCache, fetchAgentRuns, state.runs]);

  // Refresh data
  const refresh = useCallback(() => {
    loadAgentRuns(filters, 1, false);
    setPage(1);
  }, [filters, loadAgentRuns]);

  // Load more data
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadAgentRuns(filters, nextPage, false);
    }
  }, [state.loading, state.hasMore, page, filters, loadAgentRuns]);

  // Update a specific agent run
  const updateAgentRun = useCallback((runId: string, updates: Partial<AgentRun>) => {
    setState(prev => ({
      ...prev,
      runs: prev.runs.map(run => 
        run.id === runId ? { ...run, ...updates, updatedAt: Date.now() } : run
      )
    }));

    // Update cache
    const cacheKey = cacheKeyRef.current;
    if (cacheKey) {
      const cached = loadFromCache(cacheKey);
      if (cached) {
        const updatedCache = {
          ...cached,
          runs: cached.runs.map(run => 
            run.id === runId ? { ...run, ...updates, updatedAt: Date.now() } : run
          )
        };
        saveToCache(cacheKey, updatedCache);
      }
    }
  }, [loadFromCache, saveToCache]);

  // Add a new agent run
  const addAgentRun = useCallback((newRun: AgentRun) => {
    setState(prev => ({
      ...prev,
      runs: [newRun, ...prev.runs],
      total: prev.total + 1
    }));

    // Show notification
    notifications.add('agent_run_started', 'Agent Run Started', newRun.target, {
      data: { agentRunId: newRun.id }
    });
  }, []);

  // Remove an agent run
  const removeAgentRun = useCallback((runId: string) => {
    setState(prev => ({
      ...prev,
      runs: prev.runs.filter(run => run.id !== runId),
      total: Math.max(0, prev.total - 1)
    }));
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval) {
      refreshIntervalRef.current = setInterval(() => {
        if (!state.loading) {
          refresh();
        }
      }, options.refreshInterval * 1000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [options.autoRefresh, options.refreshInterval, state.loading, refresh]);

  // Initial load and filter changes
  useEffect(() => {
    loadAgentRuns(filters, 1);
    setPage(1);
  }, [filters, loadAgentRuns]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    refresh,
    loadMore,
    updateAgentRun,
    addAgentRun,
    removeAgentRun,
    
    // Pagination
    page,
    pageSize,
    
    // Utilities
    clearCache: () => storage.remove(cacheKeyRef.current),
    getCacheInfo: () => ({
      cacheKey: cacheKeyRef.current,
      lastUpdated: state.lastUpdated,
      cacheSize: state.runs.length
    })
  };
}

