// GitHub API Client

import {
  GitHubRepository,
  GitHubPullRequest,
  GitHubUser,
  GitHubBranch,
  GitHubCommit,
  GitHubRateLimit,
  GitHubRepoFilters,
  GitHubPRFilters,
} from './githubTypes';

// Define GitHubAPIError interface locally
interface GitHubAPIError {
  message: string;
  status: number;
  documentation_url?: string;
}

export class GitHubAPIClient {
  private token: string;
  private baseURL = 'https://api.github.com';
  private rateLimit: GitHubRateLimit | null = null;

  constructor(token: string) {
    this.token = token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Update rate limit info from headers
      this.updateRateLimit(response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GitHubAPIErrorClass({
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          documentation_url: errorData.documentation_url,
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof GitHubAPIErrorClass) {
        throw error;
      }
      
      // Network or other errors
      throw new GitHubAPIErrorClass({
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 0,
      });
    }
  }

  private updateRateLimit(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const used = headers.get('x-ratelimit-used');

    if (limit && remaining && reset && used) {
      this.rateLimit = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        used: parseInt(used, 10),
      };
    }
  }

  // Get current authenticated user
  async getCurrentUser(): Promise<GitHubUser> {
    return this.makeRequest<GitHubUser>('/user');
  }

  // Get user repositories
  async getUserRepositories(filters: GitHubRepoFilters = {}): Promise<GitHubRepository[]> {
    const params = new URLSearchParams();
    
    if (filters.visibility) params.append('visibility', filters.visibility);
    if (filters.affiliation) params.append('affiliation', filters.affiliation);
    if (filters.type) params.append('type', filters.type);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.page) params.append('page', filters.page.toString());

    const queryString = params.toString();
    const endpoint = `/user/repos${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<GitHubRepository[]>(endpoint);
  }

  // Get organization repositories
  async getOrgRepositories(org: string, filters: GitHubRepoFilters = {}): Promise<GitHubRepository[]> {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.page) params.append('page', filters.page.toString());

    const queryString = params.toString();
    const endpoint = `/orgs/${org}/repos${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<GitHubRepository[]>(endpoint);
  }

  // Get repository details
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  // Get repository pull requests
  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    filters: GitHubPRFilters = {}
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams();
    
    if (filters.state) params.append('state', filters.state);
    if (filters.head) params.append('head', filters.head);
    if (filters.base) params.append('base', filters.base);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.page) params.append('page', filters.page.toString());

    const queryString = params.toString();
    const endpoint = `/repos/${owner}/${repo}/pulls${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<GitHubPullRequest[]>(endpoint);
  }

  // Get pull requests ahead of main branch
  async getPullRequestsAheadOfMain(
    owner: string,
    repo: string,
    mainBranch: string = 'main'
  ): Promise<GitHubPullRequest[]> {
    // Get all open PRs
    const allPRs = await this.getRepositoryPullRequests(owner, repo, {
      state: 'open',
      per_page: 100,
    });

    // Filter PRs that are not targeting the main branch (these are ahead of main)
    const prsAheadOfMain = allPRs.filter(pr => pr.base.ref !== mainBranch);
    
    return prsAheadOfMain;
  }

  // Get repository branches
  async getRepositoryBranches(
    owner: string,
    repo: string,
    per_page: number = 30,
    page: number = 1
  ): Promise<GitHubBranch[]> {
    const params = new URLSearchParams({
      per_page: per_page.toString(),
      page: page.toString(),
    });

    return this.makeRequest<GitHubBranch[]>(`/repos/${owner}/${repo}/branches?${params}`);
  }

  // Get repository commits
  async getRepositoryCommits(
    owner: string,
    repo: string,
    sha?: string,
    per_page: number = 30,
    page: number = 1
  ): Promise<GitHubCommit[]> {
    const params = new URLSearchParams({
      per_page: per_page.toString(),
      page: page.toString(),
    });

    if (sha) {
      params.append('sha', sha);
    }

    return this.makeRequest<GitHubCommit[]>(`/repos/${owner}/${repo}/commits?${params}`);
  }

  // Validate token by making a simple API call
  async validateToken(): Promise<{ valid: boolean; user?: GitHubUser; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      return { valid: true, user };
    } catch (error) {
      if (error instanceof GitHubAPIErrorClass) {
        return { 
          valid: false, 
          error: error.status === 401 ? 'Invalid or expired token' : error.message 
        };
      }
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get current rate limit status
  getRateLimit(): GitHubRateLimit | null {
    return this.rateLimit;
  }

  // Update token
  updateToken(newToken: string): void {
    this.token = newToken;
    this.rateLimit = null; // Reset rate limit info
  }

  // Helper method to parse repository full name
  static parseRepoFullName(fullName: string): { owner: string; repo: string } | null {
    const parts = fullName.split('/');
    if (parts.length !== 2) {
      return null;
    }
    return { owner: parts[0], repo: parts[1] };
  }

  // Helper method to get repository URL from full name
  static getRepositoryURL(fullName: string): string {
    return `https://github.com/${fullName}`;
  }
}

// Error class for GitHub API errors
class GitHubAPIErrorClass extends Error {
  public status: number;
  public documentation_url?: string;

  constructor(error: GitHubAPIError) {
    super(error.message);
    this.name = 'GitHubAPIError';
    this.status = error.status;
    this.documentation_url = error.documentation_url;
  }
}

// Singleton instance management
let githubClient: GitHubAPIClient | null = null;

export function getGitHubClient(token?: string): GitHubAPIClient {
  if (!githubClient && !token) {
    throw new Error('GitHub client not initialized. Provide a token.');
  }
  
  if (token) {
    if (!githubClient) {
      githubClient = new GitHubAPIClient(token);
    } else {
      githubClient.updateToken(token);
    }
  }
  
  return githubClient!;
}

export function resetGitHubClient(): void {
  githubClient = null;
}
