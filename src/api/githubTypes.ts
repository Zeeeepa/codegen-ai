// GitHub API Types

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  archived: boolean;
  disabled: boolean;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'draft';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
    repo: {
      name: string;
      full_name: string;
    } | null;
  };
  base: {
    ref: string;
    sha: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  draft: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}

// API Response Types
export interface GitHubRepositoriesResponse {
  repositories: GitHubRepository[];
  total_count: number;
}

export interface GitHubPullRequestsResponse {
  pull_requests: GitHubPullRequest[];
  total_count: number;
}

// Error Types
export interface GitHubAPIError {
  message: string;
  documentation_url?: string;
  status: number;
}

// Rate Limit Info
export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

// Search Parameters
export interface GitHubSearchParams {
  q?: string;
  sort?: 'updated' | 'created' | 'pushed' | 'full_name';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

// Repository Filters
export interface GitHubRepoFilters {
  visibility?: 'all' | 'public' | 'private';
  affiliation?: 'owner' | 'collaborator' | 'organization_member';
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

// Pull Request Filters
export interface GitHubPRFilters {
  state?: 'open' | 'closed' | 'all';
  head?: string;
  base?: string;
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}
