import type { Repository, PullRequest, GitHubApiResponse, Commit, PRStatus } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubAPI {
  private token: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(token: string) {
    this.token = token;
  }

  // Public getter for token
  get authToken(): string {
    return this.token;
  }

  // Clear the API cache
  clearCache(): void {
    this.cache.clear();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<GitHubApiResponse<T>> {
    const cacheKey = `${endpoint}${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { data: cached.data, headers: {} };
    }

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitHub API error (${response.status}): ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        }
      } catch {
        // If we can't parse the error response, just use the status text
      }
      
      if (response.status === 401) {
        throw new Error('Invalid GitHub token');
      }
      if (response.status === 403) {
        throw new Error('API rate limit exceeded');
      }
      if (response.status === 404) {
        throw new Error(`Repository or branch not found: ${errorMessage}`);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });

    return {
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.request('/user');
      return true;
    } catch (error) {
      return false;
    }
  }

  async searchRepositories(query: string, page = 1): Promise<{ repositories: Repository[]; hasMore: boolean }> {
    const { data } = await this.request<{ items: Repository[]; total_count: number }>(
      `/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20&page=${page}`
    );
    
    return {
      repositories: data.items,
      hasMore: data.items.length === 20,
    };
  }

  async getUserRepositories(page = 1): Promise<{ repositories: Repository[]; hasMore: boolean }> {
    const { data } = await this.request<Repository[]>(
      `/user/repos?sort=updated&order=desc&per_page=20&page=${page}`
    );
    
    return {
      repositories: data,
      hasMore: data.length === 20,
    };
  }

  async getPullRequests(
    repositories: Repository[],
    states: string[] = ['open'],
    page = 1
  ): Promise<{ pullRequests: PullRequest[]; hasMore: boolean }> {
    if (repositories.length === 0) {
      return { pullRequests: [], hasMore: false };
    }

    const perPage = 100;
    const promises = repositories.map(async (repo) => {
      try {
        // Fetch all PRs (open and closed) to properly filter them
        const { data } = await this.request<PullRequest[]>(
          `/repos/${repo.full_name}/pulls?state=all&sort=updated&order=desc&per_page=${perPage}&page=${page}`
        );
        
        // Enhance each PR with additional details
        const enhancedPRs = await Promise.all(
          data.map(async (pr) => {
            try {
              // Get detailed PR info including file changes
              const { data: detailedPR } = await this.request<PullRequest>(
                `/repos/${repo.full_name}/pulls/${pr.number}`
              );
              return {
                ...pr,
                additions: detailedPR.additions,
                deletions: detailedPR.deletions,
                changed_files: detailedPR.changed_files,
              };
            } catch (error) {
              console.error(`Failed to get detailed PR info for ${repo.full_name}#${pr.number}:`, error);
              return pr;
            }
          })
        );
        
        return enhancedPRs.filter(pr => {
          if (states.includes('merged') && pr.merged_at) return true;
          if (states.includes('closed') && pr.state === 'closed' && !pr.merged_at) return true;
          if (states.includes('open') && pr.state === 'open') return true;
          return false;
        });
      } catch (error) {
        console.error(`Failed to fetch PRs for ${repo.full_name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allPullRequests = results.flat().sort((a, b) => 
      new Date(b.updated_at || b.created_at || '').getTime() - new Date(a.updated_at || a.created_at || '').getTime()
    );

    // For pagination, take a larger slice
    const startIndex = (page - 1) * 50;
    const endIndex = startIndex + 50;
    const paginatedPRs = allPullRequests.slice(startIndex, endIndex);

    return {
      pullRequests: paginatedPRs,
      hasMore: endIndex < allPullRequests.length,
    };
  }

  async getPullRequestStats(repositories: Repository[]): Promise<{
    open: number;
    merged: number;
    closed: number;
  }> {
    if (repositories.length === 0) {
      return { open: 0, merged: 0, closed: 0 };
    }

    const promises = repositories.map(async (repo) => {
      try {
        // Get all PRs to count them properly
        const { data } = await this.request<PullRequest[]>(
          `/repos/${repo.full_name}/pulls?state=all&per_page=100`
        );
        
        const stats = { open: 0, merged: 0, closed: 0 };
        
        data.forEach(pr => {
          if (pr.merged_at) {
            stats.merged++;
          } else if (pr.state === 'closed') {
            stats.closed++;
          } else if (pr.state === 'open') {
            stats.open++;
          }
        });
        
        return stats;
      } catch (error) {
        console.error(`Failed to fetch PR stats for ${repo.full_name}:`, error);
        return { open: 0, merged: 0, closed: 0 };
      }
    });

    const results = await Promise.all(promises);
    
    return results.reduce(
      (total, stats) => ({
        open: total.open + stats.open,
        merged: total.merged + stats.merged,
        closed: total.closed + stats.closed,
      }),
      { open: 0, merged: 0, closed: 0 }
    );
  }

  async deletePullRequest(repoFullName: string, prNumber: number): Promise<void> {
    // Note: GitHub API doesn't allow deleting PRs, but we can close them
    await this.request(`/repos/${repoFullName}/pulls/${prNumber}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: 'closed'
      }),
    });
  }

  async getWebhooks(repoFullName: string): Promise<any[]> {
    try {
      const { data } = await this.request<any[]>(`/repos/${repoFullName}/hooks`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch webhooks for ${repoFullName}:`, error);
      return [];
    }
  }

  async createWebhook(repoFullName: string, webhookConfig: any): Promise<any> {
    const { data } = await this.request<any>(`/repos/${repoFullName}/hooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookConfig),
    });
    return data;
  }

  async checkPullRequestMergeability(repoFullName: string, prNumber: number): Promise<{
    mergeable: boolean | null;
    mergeable_state: string;
    has_conflicts: boolean;
  }> {
    try {
      const { data } = await this.request<any>(`/repos/${repoFullName}/pulls/${prNumber}`);
      return {
        mergeable: data.mergeable,
        mergeable_state: data.mergeable_state,
        has_conflicts: data.mergeable === false || data.mergeable_state === 'dirty'
      };
    } catch (error) {
      console.error(`Failed to check mergeability for ${repoFullName}#${prNumber}:`, error);
      return {
        mergeable: null,
        mergeable_state: 'unknown',
        has_conflicts: false
      };
    }
  }

  async mergePullRequest(repoFullName: string, prNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const { data } = await this.request<any>(`/repos/${repoFullName}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merge_method: mergeMethod
        }),
      });
      return {
        success: true,
        message: data.message
      };
    } catch (error: any) {
      console.error(`Failed to merge PR ${repoFullName}#${prNumber}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to merge pull request'
      };
    }
  }

  async getCommits(repoFullName: string, branch?: string, page = 1, perPage = 30): Promise<{
    commits: Commit[];
    hasMore: boolean;
  }> {
    try {
      // If no branch specified, get the repository's default branch
      let targetBranch = branch;
      if (!targetBranch) {
        try {
          const { data: repoData } = await this.request<Repository>(`/repos/${repoFullName}`);
          targetBranch = repoData.default_branch || 'main';
        } catch (repoError: any) {
          // If we can't get repo info, provide a more specific error
          if (repoError.message?.includes('404')) {
            throw new Error(`Repository '${repoFullName}' not found or not accessible. Please check the repository name and your access permissions.`);
          }
          throw new Error(`Failed to access repository '${repoFullName}': ${repoError.message}`);
        }
      }

      const { data } = await this.request<Commit[]>(
        `/repos/${repoFullName}/commits?sha=${targetBranch}&per_page=${perPage}&page=${page}`
      );
      return await this.processCommitsData(data, repoFullName, perPage);
    } catch (error: any) {
      // If the request failed and we're using the default branch, try common alternatives
      if (!branch && error.message?.includes('404')) {
        const fallbackBranches = ['main', 'master', 'develop'];
        
        for (const fallbackBranch of fallbackBranches) {
          try {
            const { data } = await this.request<Commit[]>(
              `/repos/${repoFullName}/commits?sha=${fallbackBranch}&per_page=${perPage}&page=${page}`
            );
            return await this.processCommitsData(data, repoFullName, perPage);
          } catch (fallbackError) {
            // Continue to next fallback
            continue;
          }
        }
        
        throw new Error(`Repository '${repoFullName}' found but no commits accessible on common branches (main, master, develop). The repository may be empty or you may lack access permissions.`);
      }
      
      // Enhance error messages for better debugging
      if (error.message?.includes('401')) {
        throw new Error(`Authentication failed. Please check your GitHub token has valid permissions for repository '${repoFullName}'.`);
      }
      if (error.message?.includes('403')) {
        throw new Error(`Access forbidden to repository '${repoFullName}'. Your token may lack necessary permissions or you've hit rate limits.`);
      }
      
      throw error;
    }
  }
  
  private async processCommitsData(data: Commit[], repoFullName: string, perPage: number): Promise<{
      commits: Commit[];
      hasMore: boolean;
    }> {
     // Enhance commits with detailed stats
     const enhancedCommits = await Promise.all(
       data.map(async (commit) => {
         try {
           const { data: detailedCommit } = await this.request<Commit>(
             `/repos/${repoFullName}/commits/${commit.sha}`
           );
           return {
             ...commit,
             stats: detailedCommit.stats,
             files: detailedCommit.files
           };
         } catch (error) {
           console.error(`Failed to get detailed commit info for ${commit.sha}:`, error);
           return commit;
         }
       })
     );
     
     return {
       commits: enhancedCommits,
       hasMore: data.length === perPage
     };
   }

  async getRepositoryBranches(repoFullName: string): Promise<{
    name: string;
    lastUpdated: string;
    commit: {
      sha: string;
      date: string;
    };
  }[]> {
    try {
      console.log(`Fetching branches for ${repoFullName}...`);
      
      // Get all branches with pagination support
      // GitHub API returns only 30 branches by default, we need to paginate
      let allBranches: {
        name: string;
        commit: {
          sha: string;
          url: string;
        };
      }[] = [];
      
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        console.log(`Fetching branches page ${page}...`);
        const { data: branches } = await this.request<{
          name: string;
          commit: {
            sha: string;
            url: string;
          };
        }[]>(
          `/repos/${repoFullName}/branches?per_page=100&page=${page}`
        );
        
        allBranches = allBranches.concat(branches);
        
        // If we got less than 100 branches, we've reached the end
        hasMorePages = branches.length === 100;
        page++;
        
        // Safety check to prevent infinite loops
        if (page > 50) {
          console.warn('Reached maximum page limit (50) for branch fetching');
          break;
        }
      }
      
      console.log(`Found ${allBranches.length} branches:`, allBranches.map(b => b.name));
      
      // For each branch, get its latest commit details
      // We'll do this in batches to avoid rate limiting
      const branchesWithDates = await Promise.allSettled(
        allBranches.map(async (branch) => {
          try {
            console.log(`Fetching commit details for branch ${branch.name} (SHA: ${branch.commit.sha})`);
            const { data: commitDetail } = await this.request<{
              commit: {
                committer: {
                  date: string;
                };
                author: {
                  date: string;
                };
              };
            }>(
              `/repos/${repoFullName}/commits/${branch.commit.sha}`
            );
            
            const commitDate = commitDetail.commit.committer?.date || commitDetail.commit.author?.date || new Date().toISOString();
            console.log(`Branch ${branch.name} commit date:`, commitDate);
            
            return {
              name: branch.name,
              lastUpdated: commitDate,
              commit: {
                sha: branch.commit.sha,
                date: commitDate
              }
            };
          } catch (error) {
            console.error(`Failed to fetch commit details for branch ${branch.name}:`, error);
            // Fallback to current time if we can't get commit details
            const fallbackDate = new Date().toISOString();
            return {
              name: branch.name,
              lastUpdated: fallbackDate,
              commit: {
                sha: branch.commit.sha,
                date: fallbackDate
              }
            };
          }
        })
      );
      
      // Filter out failed requests and extract successful results
      const successfulBranches = branchesWithDates
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
      
      console.log(`Successfully processed ${successfulBranches.length} branches`);
      
      // Sort by most recent first
      return successfulBranches.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    } catch (error) {
      console.error(`Failed to fetch branches for ${repoFullName}:`, error);
      return []; // return empty array instead of fallback names to avoid confusion
    }
  }

  async revertToCommit(repoFullName: string, commitSha: string, branch?: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // If no branch specified, get the repository's default branch
      let targetBranch = branch;
      if (!targetBranch) {
        try {
          const { data: repoData } = await this.request<Repository>(`/repos/${repoFullName}`);
          targetBranch = repoData.default_branch || 'main';
        } catch (repoError: any) {
          // If we can't get repo info, try common branch names
          const fallbackBranches = ['main', 'master', 'develop'];
          for (const fallbackBranch of fallbackBranches) {
            try {
              await this.request<any>(`/repos/${repoFullName}/git/refs/heads/${fallbackBranch}`);
              targetBranch = fallbackBranch;
              break;
            } catch {
              continue;
            }
          }
          if (!targetBranch) {
            throw new Error(`Could not determine default branch for repository '${repoFullName}'`);
          }
        }
      }

      // Verify the target branch exists before attempting to update it
      try {
        await this.request<any>(`/repos/${repoFullName}/git/refs/heads/${targetBranch}`);
      } catch (refError: any) {
        if (refError.message?.includes('404')) {
          throw new Error(`Branch '${targetBranch}' does not exist in repository '${repoFullName}'`);
        }
        throw refError;
      }

      // This is a simplified approach - in reality, you'd want to create a new branch
      // and potentially open a PR with the revert changes
      const { data } = await this.request<any>(`/repos/${repoFullName}/git/refs/heads/${targetBranch}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sha: commitSha,
          force: true
        }),
      });
      
      return {
        success: true,
        message: `Successfully reverted ${targetBranch} to commit ${commitSha.substring(0, 7)}`
      };
    } catch (error: any) {
      console.error(`Failed to revert to commit ${commitSha}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to revert to selected commit'
      };
    }
  }

  // Alias method for backward compatibility
  async getBranches(repoFullName: string): Promise<{
    name: string;
    commit: {
      sha: string;
      commit: {
        author: {
          date: string;
        };
      };
    };
  }[]> {
    const branches = await this.getRepositoryBranches(repoFullName);
    return branches.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        commit: {
          author: {
            date: branch.commit.date
          }
        }
      }
    }));
  }
}