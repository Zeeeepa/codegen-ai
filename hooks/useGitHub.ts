import { useState, useEffect, useCallback } from 'react';
import { GitHubAPI } from '../utils/api';
import { encryptToken, decryptToken } from '../utils/crypto';
import type { Repository, PullRequest, PRStatus } from '../types';

export function useGitHub() {
  const [token, setTokenState] = useState<string | null>(null);
  const [api, setApi] = useState<GitHubAPI | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Load token from environment variable or localStorage on mount
  useEffect(() => {
    // First check for environment variable (VITE_GITHUB_TOKEN)
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    if (envToken) {
      setTokenState(envToken);
      return;
    }

    // Fallback to localStorage
    const stored = localStorage.getItem('github_token');
    if (stored) {
      const decrypted = decryptToken(stored);
      if (decrypted) {
        setTokenState(decrypted);
      } else {
        localStorage.removeItem('github_token');
      }
    }
  }, []);

  // Create API instance when token changes
  useEffect(() => {
    if (token) {
      const apiInstance = new GitHubAPI(token);
      setApi(apiInstance);
      
      // Validate token
      setIsValidating(true);
      apiInstance.validateToken()
        .then(isValid => {
          setIsAuthenticated(isValid);
          if (!isValid) {
            localStorage.removeItem('github_token');
            setTokenState(null);
          }
        })
        .catch(() => {
          setIsAuthenticated(false);
          localStorage.removeItem('github_token');
          setTokenState(null);
        })
        .finally(() => setIsValidating(false));
    } else {
      setApi(null);
      setIsAuthenticated(false);
    }
  }, [token]);

  const setToken = useCallback((newToken: string) => {
    const encrypted = encryptToken(newToken);
    localStorage.setItem('github_token', encrypted);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('github_token');
    setTokenState(null);
    setApi(null);
    setIsAuthenticated(false);
  }, []);

  return {
    token,
    api,
    isAuthenticated,
    isValidating,
    setToken,
    logout,
  };
}

export function usePullRequests(
  api: GitHubAPI | null,
  repositories: Repository[],
  statuses: PRStatus[]
) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ open: 0, merged: 0, closed: 0 });

  const loadPullRequests = useCallback(async (reset = false) => {
    if (!api || repositories.length === 0) {
      setPullRequests([]);
      setStats({ open: 0, merged: 0, closed: 0 });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentPage = reset ? 1 : page;
      
      // Load PR stats and PRs in parallel
      const [prResult, statsResult] = await Promise.all([
        api.getPullRequests(repositories, statuses, currentPage),
        reset ? api.getPullRequestStats(repositories) : Promise.resolve(stats)
      ]);

      if (reset) {
        setPullRequests(prResult.pullRequests);
        setPage(2);
        setStats(statsResult);
      } else {
        setPullRequests(prev => [...prev, ...prResult.pullRequests]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(prResult.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pull requests');
    } finally {
      setIsLoading(false);
    }
  }, [api, repositories, statuses, page, stats]);

  // Reset and reload when dependencies change
  useEffect(() => {
    setPage(1);
    loadPullRequests(true);
  }, [api, repositories, statuses]);

  // Listen for custom refresh events
  useEffect(() => {
    const handleRefresh = () => {
      setPage(1);
      loadPullRequests(true);
    };

    window.addEventListener('refreshPRList', handleRefresh);
    return () => window.removeEventListener('refreshPRList', handleRefresh);
  }, [loadPullRequests]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadPullRequests(false);
    }
  }, [isLoading, hasMore, loadPullRequests]);

  return {
    pullRequests,
    isLoading,
    error,
    hasMore,
    stats,
    loadMore,
    reload: () => loadPullRequests(true),
  };
}