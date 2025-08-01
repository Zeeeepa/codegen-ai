import React, { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, GitPullRequest, User, Calendar } from 'lucide-react';
import { CachedProject } from '../api/types';
import { GitHubPullRequest } from '../api/githubTypes';
import { getGitHubClient } from '../api/github';
import { getPreferenceValues } from '../utils/preferences';


interface PRListModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CachedProject;
}

export function PRListModal({ isOpen, onClose, project }: PRListModalProps) {
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPullRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const preferences = await getPreferenceValues();
      if (!preferences.githubToken) {
        setError('GitHub token not configured');
        return;
      }

      const client = getGitHubClient(preferences.githubToken);
      const [owner, repo] = project.fullName.split('/');
      
      // Get default branch first
      const repoData = await client.getRepository(owner, repo);
      const defaultBranch = repoData.default_branch;
      
      // Get pull requests that are ahead of the default branch
      const pullRequests = await client.getPullRequestsAheadOfMain(owner, repo, defaultBranch);
      
      setPullRequests(pullRequests);
    } catch (error) {
      console.error('Failed to load pull requests:', error);
      setError('Failed to load pull requests');
    } finally {
      setLoading(false);
    }
  }, [project.fullName]);

  useEffect(() => {
    if (isOpen) {
      loadPullRequests();
    }
  }, [isOpen, loadPullRequests]);



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStateColor = (state: string, draft: boolean) => {
    if (draft) return 'text-gray-400 bg-gray-700';
    switch (state) {
      case 'open':
        return 'text-green-400 bg-green-900/20';
      case 'closed':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-700';
    }
  };

  const getStateIcon = (state: string, draft: boolean) => {
    if (draft) return '📝';
    switch (state) {
      case 'open':
        return '🟢';
      case 'closed':
        return '🔴';
      default:
        return '⚪';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <GitPullRequest className="h-6 w-6 text-red-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Pull Requests Ahead of Main</h2>
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
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 ml-3">Loading pull requests...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="text-red-400 text-4xl mb-2">⚠️</div>
                <p className="text-red-400 font-medium">{error}</p>
                <button
                  onClick={loadPullRequests}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : pullRequests.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-lg font-medium text-white mb-2">No PRs Ahead of Main</h3>
                <p className="text-gray-400">
                  All pull requests are targeting the main branch or there are no open PRs.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  {pullRequests.length} Pull Request{pullRequests.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-gray-400">
                  PRs not targeting {project.defaultBranch} branch
                </p>
              </div>

              {pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* PR Title and Number */}
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg">
                          {getStateIcon(pr.state, pr.draft)}
                        </span>
                        <h4 className="text-lg font-medium text-white truncate">
                          {pr.title}
                        </h4>
                        <span className="text-sm text-gray-400">#{pr.number}</span>
                      </div>

                      {/* PR Description */}
                      {pr.body && (
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                          {pr.body}
                        </p>
                      )}

                      {/* PR Metadata */}
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{pr.user.login}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created {formatDate(pr.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <GitPullRequest className="h-3 w-3" />
                          <span>{pr.head.ref} → {pr.base.ref}</span>
                        </div>
                      </div>

                      {/* PR Stats */}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>+{pr.additions} additions</span>
                        <span>-{pr.deletions} deletions</span>
                        <span>{pr.commits} commits</span>
                        <span>{pr.changed_files} files changed</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* State Badge */}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStateColor(pr.state, pr.draft)}`}>
                        {pr.draft ? 'Draft' : pr.state}
                      </span>

                      {/* External Link */}
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        title="Open in GitHub"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  {/* Mergeable Status */}
                  {pr.mergeable !== null && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          pr.mergeable ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-xs text-gray-400">
                          {pr.mergeable ? 'Ready to merge' : 'Merge conflicts detected'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({pr.mergeable_state})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {pullRequests.length > 0 && (
              <span>
                Showing PRs that are not targeting the <code className="bg-gray-700 px-1 rounded">{project.defaultBranch}</code> branch
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
